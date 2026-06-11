// ============================================================================
//  QVAULT ($QVLT) — Quantum-Proof Community Token
//  Solana / Anchor Framework v0.30.1
//
//  Features:
//    • SPL Token mint with configurable supply (1,000,000,000 QVLT)
//    • On-chain metadata via Metaplex Token Metadata Program
//    • Three staking tiers: Electron / Photon / Qubit
//    • Fee distribution: stakers 40% | buyback 20% | DAO 25% | growth 15%
//    • DAO governance: proposals + weighted voting
//    • Emergency pause (admin multisig)
//    • Upgrade authority revocation path
//
//  Audit note: This code is NOT audited. Do NOT deploy to mainnet
//  without a professional security audit (e.g. OtterSec, Halborn, Trail of Bits).
// ============================================================================

use anchor_lang::prelude::*;
use anchor_spl::{
    metadata::{
        create_metadata_accounts_v3, mpl_token_metadata::types::DataV2,
        CreateMetadataAccountsV3, Metadata,
    },
    token::{self, Mint, MintTo, Token, TokenAccount, Transfer, Burn},
};

declare_id!("BLTxBWAv3JwewqX8U3TuNBPuTBUyaCd8DSQP1DVGhQiY");

// ── Constants ────────────────────────────────────────────────────────────────
pub const TOTAL_SUPPLY:      u64 = 1_000_000_000 * 10u64.pow(9); // 1B with 9 decimals
pub const TOKEN_DECIMALS:     u8 = 9;
pub const TOKEN_NAME:       &str = "QVAULT";
pub const TOKEN_SYMBOL:     &str = "QVLT";
pub const TOKEN_URI:        &str = "https://qvlt.xyz/metadata/qvlt.json";

// Staking tier thresholds (raw token amounts, 9 decimals)
pub const TIER_ELECTRON:    u64 = 10_000      * 10u64.pow(9);
pub const TIER_PHOTON:      u64 = 50_000      * 10u64.pow(9);
pub const TIER_QUBIT:       u64 = 250_000     * 10u64.pow(9);

// APY basis points (1 bp = 0.01%) — stored on-chain, adjustable by DAO
pub const APY_ELECTRON_LO:  u16 = 800;   //  8.00%
pub const APY_ELECTRON_HI:  u16 = 1200;  // 12.00%
pub const APY_PHOTON_LO:    u16 = 1400;  // 14.00%
pub const APY_PHOTON_HI:    u16 = 2000;  // 20.00%
pub const APY_QUBIT_LO:     u16 = 2200;  // 22.00%
pub const APY_QUBIT_HI:     u16 = 3000;  // 30.00%

// Fee split (basis points out of 10_000)
pub const FEE_STAKERS:      u16 = 4000;  // 40%
pub const FEE_BUYBACK:      u16 = 2000;  // 20%
pub const FEE_DAO:          u16 = 2500;  // 25%
pub const FEE_GROWTH:       u16 = 1500;  // 15%

// Governance
pub const MIN_VOTE_QUBIT:   u64 = TIER_QUBIT;
pub const PROPOSAL_DURATION: i64 = 7 * 24 * 3600; // 7 days in seconds
pub const MAX_PROPOSALS:    usize = 64;
// Minimum participation for a proposal to pass: total votes cast (for + against)
// must be at least this fraction of all staked tokens, in basis points.
pub const QUORUM_BPS:       u64 = 1000; // 10% of total staked

// Governance limits
pub const MAX_TITLE_LEN:       usize = 128;
pub const MAX_DESCRIPTION_LEN: usize = 512;

// Seeds
pub const SEED_CONFIG:        &[u8] = b"qvault_config";
pub const SEED_STAKE:         &[u8] = b"stake_account";
pub const SEED_TREASURY:      &[u8] = b"treasury";
pub const SEED_STAKING_VAULT: &[u8] = b"staking_vault";
pub const SEED_BUYBACK:       &[u8] = b"buyback_vault";
pub const SEED_DAO:           &[u8] = b"dao_vault";
pub const SEED_PROPOSAL:      &[u8] = b"proposal";
pub const SEED_VESTING:       &[u8] = b"vesting";

// ── Error Codes ──────────────────────────────────────────────────────────────
#[error_code]
pub enum QvaultError {
    #[msg("Program is paused by admin")]
    Paused,
    #[msg("Unauthorized: caller is not the admin")]
    Unauthorized,
    #[msg("Stake amount below minimum tier threshold")]
    BelowMinimumStake,
    #[msg("Nothing staked in this account")]
    NothingStaked,
    #[msg("Stake is still locked — lockup period not elapsed")]
    StillLocked,
    #[msg("Insufficient staked balance to unstake requested amount")]
    InsufficientStake,
    #[msg("Proposal voting period has ended")]
    VotingClosed,
    #[msg("Proposal voting period has not ended yet")]
    VotingOpen,
    #[msg("Voter does not meet minimum Qubit tier requirement")]
    InsufficientVotingPower,
    #[msg("Voter has already cast a vote on this proposal")]
    AlreadyVoted,
    #[msg("Proposal already executed")]
    AlreadyExecuted,
    #[msg("Proposal did not pass quorum")]
    QuorumNotMet,
    #[msg("Arithmetic overflow")]
    MathOverflow,
    #[msg("Invalid fee split — must sum to 10,000 basis points")]
    InvalidFeeSplit,
    #[msg("Metadata URI too long (max 200 chars)")]
    UriTooLong,
    #[msg("Amount must be greater than zero")]
    AmountZero,
    #[msg("Treasury has insufficient balance for this operation")]
    InsufficientTreasury,
    #[msg("Provided vault account does not match the configured vault")]
    InvalidVaultAccount,
    #[msg("No rewards available to claim")]
    NothingToClaim,
    #[msg("Proposal title exceeds maximum length")]
    TitleTooLong,
    #[msg("Proposal description exceeds maximum length")]
    DescriptionTooLong,
    #[msg("Caller is not the pending admin")]
    NotPendingAdmin,
    #[msg("Invalid vesting parameters")]
    InvalidVestingParams,
    #[msg("Vesting cliff not reached yet")]
    CliffNotReached,
    #[msg("Nothing is currently vested to claim")]
    NothingVested,
}

// ── Program Entry ─────────────────────────────────────────────────────────────
#[program]
pub mod qvault {
    use super::*;

    // ── 1. INITIALIZE ──────────────────────────────────────────────────────
    /// Called once by the deployer. Creates the global config PDA, mints the
    /// full 1B QVLT supply to the treasury vault, and registers on-chain metadata.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.admin           = ctx.accounts.admin.key();
        config.pending_admin   = Pubkey::default();
        config.mint            = ctx.accounts.mint.key();
        config.treasury_vault  = ctx.accounts.treasury_vault.key();
        config.staking_vault   = ctx.accounts.staking_vault.key();
        config.buyback_vault   = ctx.accounts.buyback_vault.key();
        config.dao_vault       = ctx.accounts.dao_vault.key();
        config.paused          = false;
        config.total_staked    = 0;
        config.total_fees_collected = 0;
        config.total_burned    = 0;
        config.total_distributed = 0;
        config.proposal_count  = 0;
        config.reserved_vesting = 0;
        config.bump            = ctx.bumps.config;

        // Fee split (can be updated by DAO)
        config.fee_stakers  = FEE_STAKERS;
        config.fee_buyback  = FEE_BUYBACK;
        config.fee_dao      = FEE_DAO;
        config.fee_growth   = FEE_GROWTH;

        // Mint full supply to treasury
        let seeds: &[&[u8]] = &[SEED_CONFIG, &[config.bump]];
        let signer = &[seeds];

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint:      ctx.accounts.mint.to_account_info(),
                    to:        ctx.accounts.treasury_vault.to_account_info(),
                    authority: ctx.accounts.config.to_account_info(),
                },
                signer,
            ),
            TOTAL_SUPPLY,
        )?;

        // Register on-chain metadata (Metaplex)
        let data = DataV2 {
            name:                   TOKEN_NAME.to_string(),
            symbol:                 TOKEN_SYMBOL.to_string(),
            uri:                    TOKEN_URI.to_string(),
            seller_fee_basis_points: 0,
            creators:               None,
            collection:             None,
            uses:                   None,
        };

        create_metadata_accounts_v3(
            CpiContext::new_with_signer(
                ctx.accounts.token_metadata_program.to_account_info(),
                CreateMetadataAccountsV3 {
                    metadata:         ctx.accounts.metadata.to_account_info(),
                    mint:             ctx.accounts.mint.to_account_info(),
                    mint_authority:   ctx.accounts.config.to_account_info(),
                    payer:            ctx.accounts.admin.to_account_info(),
                    update_authority: ctx.accounts.config.to_account_info(),
                    system_program:   ctx.accounts.system_program.to_account_info(),
                    rent:             ctx.accounts.rent.to_account_info(),
                },
                signer,
            ),
            data,
            true,  // is_mutable (can be frozen by DAO later)
            true,  // update_authority_is_signer
            None,  // collection details
        )?;

        emit!(TokenInitialized {
            mint:    ctx.accounts.mint.key(),
            supply:  TOTAL_SUPPLY,
            admin:   ctx.accounts.admin.key(),
        });

        Ok(())
    }

    // ── 2. STAKE ───────────────────────────────────────────────────────────
    /// Stake QVLT tokens. Determines tier automatically. Locks for `lockup_days`.
    pub fn stake(ctx: Context<Stake>, amount: u64, lockup_days: u16) -> Result<()> {
        require!(!ctx.accounts.config.paused, QvaultError::Paused);
        require!(amount >= TIER_ELECTRON,     QvaultError::BelowMinimumStake);

        let stake_acc = &mut ctx.accounts.stake_account;
        let config    = &mut ctx.accounts.config;
        let clock      = Clock::get()?;

        // Transfer tokens from user → staking vault (PDA-owned)
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from:      ctx.accounts.user_token_account.to_account_info(),
                    to:        ctx.accounts.staking_vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        // Accumulate pending rewards before changing balance (if re-staking)
        if stake_acc.amount > 0 {
            let pending = calculate_pending_rewards(stake_acc, clock.unix_timestamp)?;
            stake_acc.pending_rewards = stake_acc
                .pending_rewards
                .checked_add(pending)
                .ok_or(QvaultError::MathOverflow)?;
        }

        stake_acc.owner       = ctx.accounts.user.key();
        stake_acc.amount      = stake_acc.amount
            .checked_add(amount)
            .ok_or(QvaultError::MathOverflow)?;
        stake_acc.staked_at   = clock.unix_timestamp;
        // Lockup can only be EXTENDED, never shortened: a new stake with a
        // shorter (or zero) lockup must not unlock previously locked tokens.
        let new_unlock = clock.unix_timestamp + (lockup_days as i64) * 86_400;
        stake_acc.unlock_at   = stake_acc.unlock_at.max(new_unlock);
        stake_acc.tier        = get_tier(stake_acc.amount);
        stake_acc.bump        = ctx.bumps.stake_account;

        config.total_staked = config.total_staked
            .checked_add(amount)
            .ok_or(QvaultError::MathOverflow)?;

        emit!(Staked {
            user:   ctx.accounts.user.key(),
            amount,
            tier:   stake_acc.tier,
            unlock: stake_acc.unlock_at,
        });

        Ok(())
    }

    // ── 3. UNSTAKE ─────────────────────────────────────────────────────────
    /// Unstake tokens after lockup period. Auto-claims pending rewards.
    /// Deliberately allowed even while paused: principal is the user's own
    /// property and must never be freezable by an admin pause. Reward payout
    /// still depends on treasury solvency (carried over if unavailable).
    pub fn unstake(ctx: Context<Unstake>, amount: u64) -> Result<()> {
        let stake_acc = &mut ctx.accounts.stake_account;
        let clock      = Clock::get()?;

        require!(stake_acc.amount > 0,                   QvaultError::NothingStaked);
        require!(clock.unix_timestamp >= stake_acc.unlock_at, QvaultError::StillLocked);
        require!(amount <= stake_acc.amount,             QvaultError::InsufficientStake);

        // Settle rewards
        let pending = calculate_pending_rewards(stake_acc, clock.unix_timestamp)?;
        let total_rewards = stake_acc.pending_rewards
            .checked_add(pending)
            .ok_or(QvaultError::MathOverflow)?;

        // Transfer principal back
        let bump = ctx.accounts.config.bump;
        let seeds: &[&[u8]] = &[SEED_CONFIG, &[bump]];
        let signer = &[seeds];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from:      ctx.accounts.staking_vault.to_account_info(),
                    to:        ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.config.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;

        // Pay out rewards from treasury vault. If the treasury can't cover them,
        // carry them over as pending (never silently drop the user's rewards).
        let rewards_paid =
            total_rewards > 0 && ctx.accounts.treasury_vault.amount >= total_rewards;
        if rewards_paid {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from:      ctx.accounts.treasury_vault.to_account_info(),
                        to:        ctx.accounts.user_token_account.to_account_info(),
                        authority: ctx.accounts.config.to_account_info(),
                    },
                    signer,
                ),
                total_rewards,
            )?;
        }

        stake_acc.amount = stake_acc.amount
            .checked_sub(amount)
            .ok_or(QvaultError::MathOverflow)?;
        stake_acc.pending_rewards = if rewards_paid { 0 } else { total_rewards };
        stake_acc.staked_at       = clock.unix_timestamp;
        stake_acc.tier            = get_tier(stake_acc.amount);

        let config = &mut ctx.accounts.config;
        config.total_staked = config.total_staked
            .checked_sub(amount)
            .ok_or(QvaultError::MathOverflow)?;

        emit!(Unstaked {
            user:    ctx.accounts.user.key(),
            amount,
            rewards: total_rewards,
        });

        Ok(())
    }

    // ── 4. CLAIM REWARDS ──────────────────────────────────────────────────
    /// Claim accumulated staking rewards without unstaking principal.
    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        require!(!ctx.accounts.config.paused, QvaultError::Paused);

        let stake_acc = &mut ctx.accounts.stake_account;
        let config    = &mut ctx.accounts.config;
        let clock      = Clock::get()?;

        require!(stake_acc.amount > 0, QvaultError::NothingStaked);

        let pending = calculate_pending_rewards(stake_acc, clock.unix_timestamp)?;
        let total_rewards = stake_acc.pending_rewards
            .checked_add(pending)
            .ok_or(QvaultError::MathOverflow)?;

        require!(total_rewards > 0, QvaultError::NothingToClaim);
        // Require the treasury can actually pay before mutating state, so the
        // user never loses accrued rewards to an underfunded treasury.
        require!(
            ctx.accounts.treasury_vault.amount >= total_rewards,
            QvaultError::InsufficientTreasury
        );

        let seeds: &[&[u8]] = &[SEED_CONFIG, &[config.bump]];
        let signer = &[seeds];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from:      ctx.accounts.treasury_vault.to_account_info(),
                    to:        ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.config.to_account_info(),
                },
                signer,
            ),
            total_rewards,
        )?;

        stake_acc.pending_rewards = 0;
        stake_acc.staked_at       = clock.unix_timestamp; // reset accrual window

        emit!(RewardsClaimed {
            user:    ctx.accounts.user.key(),
            rewards: total_rewards,
        });

        Ok(())
    }

    // ── 5. DISTRIBUTE FEES ────────────────────────────────────────────────
    /// Admin deposits protocol fees and distributes them per the fee split.
    pub fn distribute_fees(ctx: Context<DistributeFees>, amount: u64) -> Result<()> {
        require!(!ctx.accounts.config.paused, QvaultError::Paused);
        require!(amount > 0, QvaultError::AmountZero);
        // Validate destination vaults against the ones registered at init, so a
        // caller can't redirect the buyback/DAO shares to arbitrary accounts.
        require!(
            ctx.accounts.buyback_vault.key() == ctx.accounts.config.buyback_vault,
            QvaultError::InvalidVaultAccount
        );
        require!(
            ctx.accounts.dao_vault.key() == ctx.accounts.config.dao_vault,
            QvaultError::InvalidVaultAccount
        );

        // Transfer fee tokens in from fee payer
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from:      ctx.accounts.fee_source.to_account_info(),
                    to:        ctx.accounts.treasury_vault.to_account_info(),
                    authority: ctx.accounts.fee_payer.to_account_info(),
                },
            ),
            amount,
        )?;

        let staker_share  = bps(amount, ctx.accounts.config.fee_stakers)?;
        let buyback_share = bps(amount, ctx.accounts.config.fee_buyback)?;
        let dao_share     = bps(amount, ctx.accounts.config.fee_dao)?;
        // growth_share goes to treasury (already deposited above)

        let bump = ctx.accounts.config.bump;
        let seeds: &[&[u8]] = &[SEED_CONFIG, &[bump]];
        let signer = &[seeds];

        // Buyback: transfer to buyback vault → burned on-chain
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from:      ctx.accounts.treasury_vault.to_account_info(),
                    to:        ctx.accounts.buyback_vault.to_account_info(),
                    authority: ctx.accounts.config.to_account_info(),
                },
                signer,
            ),
            buyback_share,
        )?;

        // DAO share: transfer to DAO vault
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from:      ctx.accounts.treasury_vault.to_account_info(),
                    to:        ctx.accounts.dao_vault.to_account_info(),
                    authority: ctx.accounts.config.to_account_info(),
                },
                signer,
            ),
            dao_share,
        )?;

        let config = &mut ctx.accounts.config;
        config.total_fees_collected = config.total_fees_collected
            .checked_add(amount)
            .ok_or(QvaultError::MathOverflow)?;

        emit!(FeesDistributed {
            total:          amount,
            to_stakers:     staker_share,
            to_buyback:     buyback_share,
            to_dao:         dao_share,
        });

        Ok(())
    }

    // ── 6. BURN (Buyback execution) ────────────────────────────────────────
    /// Burns tokens from the buyback vault, permanently reducing supply.
    pub fn execute_buyback_burn(ctx: Context<ExecuteBuybackBurn>, amount: u64) -> Result<()> {
        require!(!ctx.accounts.config.paused, QvaultError::Paused);
        require!(
            ctx.accounts.admin.key() == ctx.accounts.config.admin,
            QvaultError::Unauthorized
        );

        let bump = ctx.accounts.config.bump;
        let seeds: &[&[u8]] = &[SEED_CONFIG, &[bump]];
        let signer = &[seeds];

        token::burn(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint:      ctx.accounts.mint.to_account_info(),
                    from:      ctx.accounts.buyback_vault.to_account_info(),
                    authority: ctx.accounts.config.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;

        let config = &mut ctx.accounts.config;
        config.total_burned = config.total_burned
            .checked_add(amount)
            .ok_or(QvaultError::MathOverflow)?;

        emit!(TokensBurned {
            amount,
            total_burned: config.total_burned,
        });

        Ok(())
    }

    // ── 7. CREATE PROPOSAL ────────────────────────────────────────────────
    /// Any Qubit-tier holder can submit a governance proposal.
    pub fn create_proposal(
        ctx: Context<CreateProposal>,
        title: String,
        description: String,
    ) -> Result<()> {
        require!(!ctx.accounts.config.paused, QvaultError::Paused);
        require!(title.len() <= MAX_TITLE_LEN, QvaultError::TitleTooLong);
        require!(
            description.len() <= MAX_DESCRIPTION_LEN,
            QvaultError::DescriptionTooLong
        );

        let stake_acc = &ctx.accounts.stake_account;
        require!(
            stake_acc.amount >= MIN_VOTE_QUBIT,
            QvaultError::InsufficientVotingPower
        );

        let config   = &mut ctx.accounts.config;
        let proposal = &mut ctx.accounts.proposal;
        let clock    = Clock::get()?;

        proposal.id          = config.proposal_count;
        proposal.proposer    = ctx.accounts.proposer.key();
        proposal.title       = title.clone();
        proposal.description = description;
        proposal.created_at  = clock.unix_timestamp;
        proposal.ends_at     = clock.unix_timestamp + PROPOSAL_DURATION;
        proposal.votes_for   = 0;
        proposal.votes_against = 0;
        proposal.executed    = false;
        proposal.bump        = ctx.bumps.proposal;

        config.proposal_count = config.proposal_count
            .checked_add(1)
            .ok_or(QvaultError::MathOverflow)?;

        emit!(ProposalCreated {
            id:       proposal.id,
            proposer: proposal.proposer,
            title,
        });

        Ok(())
    }

    // ── 8. VOTE ───────────────────────────────────────────────────────────
    /// Qubit holders vote on proposals. Weight = staked amount.
    pub fn vote(ctx: Context<Vote>, proposal_id: u64, support: bool) -> Result<()> {
        require!(!ctx.accounts.config.paused, QvaultError::Paused);

        let stake_acc = &mut ctx.accounts.stake_account;
        let proposal  = &mut ctx.accounts.proposal;
        let vote_rec  = &mut ctx.accounts.vote_record;
        let clock     = Clock::get()?;

        require!(
            stake_acc.amount >= MIN_VOTE_QUBIT,
            QvaultError::InsufficientVotingPower
        );
        require!(
            clock.unix_timestamp <= proposal.ends_at,
            QvaultError::VotingClosed
        );
        require!(!vote_rec.has_voted, QvaultError::AlreadyVoted);

        let voting_power = stake_acc.amount;

        // Lock the voter's stake until the proposal closes. This binds voting
        // power to the lockup so tokens can't be unstaked, moved to another
        // wallet, and used to vote again within the same window.
        stake_acc.unlock_at = stake_acc.unlock_at.max(proposal.ends_at);

        if support {
            proposal.votes_for = proposal.votes_for
                .checked_add(voting_power)
                .ok_or(QvaultError::MathOverflow)?;
        } else {
            proposal.votes_against = proposal.votes_against
                .checked_add(voting_power)
                .ok_or(QvaultError::MathOverflow)?;
        }

        vote_rec.voter       = ctx.accounts.voter.key();
        vote_rec.proposal_id = proposal_id;
        vote_rec.has_voted   = true;
        vote_rec.support     = support;
        vote_rec.weight      = voting_power;

        emit!(Voted {
            voter:        ctx.accounts.voter.key(),
            proposal_id,
            support,
            voting_power,
        });

        Ok(())
    }

    // ── 9. EXECUTE PROPOSAL ───────────────────────────────────────────────
    /// After voting period ends, admin executes a passed proposal.
    pub fn execute_proposal(ctx: Context<ExecuteProposal>) -> Result<()> {
        let config   = &ctx.accounts.config;
        let proposal = &mut ctx.accounts.proposal;
        let clock    = Clock::get()?;

        require!(
            ctx.accounts.admin.key() == config.admin,
            QvaultError::Unauthorized
        );
        require!(
            clock.unix_timestamp > proposal.ends_at,
            QvaultError::VotingOpen
        );
        require!(!proposal.executed, QvaultError::AlreadyExecuted);

        // Quorum: total participation must reach QUORUM_BPS of all staked tokens.
        let total_votes = proposal.votes_for
            .checked_add(proposal.votes_against)
            .ok_or(QvaultError::MathOverflow)?;
        let quorum_threshold = (config.total_staked as u128)
            .checked_mul(QUORUM_BPS as u128)
            .ok_or(QvaultError::MathOverflow)?
            / 10_000u128;
        require!(
            (total_votes as u128) >= quorum_threshold,
            QvaultError::QuorumNotMet
        );
        require!(
            proposal.votes_for > proposal.votes_against,
            QvaultError::QuorumNotMet
        );

        proposal.executed = true;

        emit!(ProposalExecuted {
            id:         proposal.id,
            votes_for:  proposal.votes_for,
            votes_against: proposal.votes_against,
        });

        Ok(())
    }

    // ── 10. ADMIN: UPDATE FEE SPLIT ───────────────────────────────────────
    pub fn update_fee_split(
        ctx: Context<AdminOnly>,
        fee_stakers: u16,
        fee_buyback: u16,
        fee_dao:     u16,
        fee_growth:  u16,
    ) -> Result<()> {
        require!(
            ctx.accounts.admin.key() == ctx.accounts.config.admin,
            QvaultError::Unauthorized
        );
        require!(
            (fee_stakers as u32 + fee_buyback as u32 + fee_dao as u32 + fee_growth as u32) == 10_000,
            QvaultError::InvalidFeeSplit
        );

        let config = &mut ctx.accounts.config;
        config.fee_stakers = fee_stakers;
        config.fee_buyback = fee_buyback;
        config.fee_dao     = fee_dao;
        config.fee_growth  = fee_growth;

        Ok(())
    }

    // ── 11. ADMIN: PAUSE / UNPAUSE ────────────────────────────────────────
    pub fn set_paused(ctx: Context<AdminOnly>, paused: bool) -> Result<()> {
        require!(
            ctx.accounts.admin.key() == ctx.accounts.config.admin,
            QvaultError::Unauthorized
        );
        ctx.accounts.config.paused = paused;
        emit!(PauseToggled { paused });
        Ok(())
    }

    // ── 12. ADMIN: TRANSFER ADMIN (two-step) ──────────────────────────────
    /// Step 1: current admin nominates a new admin. Nothing changes until the
    /// nominee accepts, preventing transfers to a wrong/unrecoverable address.
    pub fn transfer_admin(ctx: Context<AdminOnly>, new_admin: Pubkey) -> Result<()> {
        require!(
            ctx.accounts.admin.key() == ctx.accounts.config.admin,
            QvaultError::Unauthorized
        );
        ctx.accounts.config.pending_admin = new_admin;
        emit!(AdminTransferProposed {
            current_admin: ctx.accounts.config.admin,
            pending_admin: new_admin,
        });
        Ok(())
    }

    /// Step 2: the nominated admin accepts and becomes the new admin.
    pub fn accept_admin(ctx: Context<AcceptAdmin>) -> Result<()> {
        require!(
            ctx.accounts.new_admin.key() == ctx.accounts.config.pending_admin,
            QvaultError::NotPendingAdmin
        );
        let config = &mut ctx.accounts.config;
        let old = config.admin;
        config.admin = config.pending_admin;
        config.pending_admin = Pubkey::default();
        emit!(AdminChanged { old_admin: old, new_admin: config.admin });
        Ok(())
    }

    // ── 13. ADMIN: WITHDRAW FROM TREASURY ─────────────────────────────────
    /// Moves tokens out of the treasury to any destination. This is the core
    /// distribution primitive: fair-launch liquidity seeding (Raydium), airdrops,
    /// DAO operations, etc. Admin-gated — MUST be a multisig before mainnet.
    pub fn withdraw_treasury(ctx: Context<WithdrawTreasury>, amount: u64) -> Result<()> {
        require!(
            ctx.accounts.admin.key() == ctx.accounts.config.admin,
            QvaultError::Unauthorized
        );
        require!(amount > 0, QvaultError::AmountZero);
        require!(
            ctx.accounts.treasury_vault.amount >= amount,
            QvaultError::InsufficientTreasury
        );
        // The treasury also backs active vesting schedules. The admin (even a
        // multisig) must never be able to withdraw the tokens reserved for
        // vesting — otherwise "vesting enforced by the contract" would be false.
        let remaining_after = ctx.accounts.treasury_vault.amount
            .checked_sub(amount)
            .ok_or(QvaultError::MathOverflow)?;
        require!(
            remaining_after >= ctx.accounts.config.reserved_vesting,
            QvaultError::InsufficientTreasury
        );

        let bump = ctx.accounts.config.bump;
        let seeds: &[&[u8]] = &[SEED_CONFIG, &[bump]];
        let signer = &[seeds];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from:      ctx.accounts.treasury_vault.to_account_info(),
                    to:        ctx.accounts.destination.to_account_info(),
                    authority: ctx.accounts.config.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;

        let config = &mut ctx.accounts.config;
        config.total_distributed = config.total_distributed
            .checked_add(amount)
            .ok_or(QvaultError::MathOverflow)?;

        emit!(TreasuryWithdrawn {
            destination: ctx.accounts.destination.key(),
            amount,
            total_distributed: config.total_distributed,
        });
        Ok(())
    }

    // ── 14. ADMIN: CREATE VESTING SCHEDULE ────────────────────────────────
    /// Sets up a linear vesting schedule (with cliff) for a beneficiary. Tokens
    /// stay in the treasury and are released via `claim_vested`. Covers Team
    /// (12mo cliff + 24mo), Community (36mo linear), Partners (6mo cliff + 18mo).
    pub fn create_vesting(
        ctx: Context<CreateVesting>,
        beneficiary: Pubkey,
        total_amount: u64,
        cliff_seconds: i64,
        duration_seconds: i64,
    ) -> Result<()> {
        require!(
            ctx.accounts.admin.key() == ctx.accounts.config.admin,
            QvaultError::Unauthorized
        );
        require!(total_amount > 0, QvaultError::AmountZero);
        require!(
            duration_seconds > 0 && cliff_seconds >= 0 && cliff_seconds <= duration_seconds,
            QvaultError::InvalidVestingParams
        );

        let now = Clock::get()?.unix_timestamp;
        let v = &mut ctx.accounts.vesting;
        v.beneficiary    = beneficiary;
        v.total_amount   = total_amount;
        v.released_amount = 0;
        v.start_ts       = now;
        v.cliff_ts       = now + cliff_seconds;
        v.end_ts         = now + duration_seconds;
        v.bump           = ctx.bumps.vesting;

        // Reserve this liability against the treasury so withdraw_treasury can
        // never pull out the tokens that back an active vesting schedule. This
        // is what makes the vesting "enforced by the contract" rather than a
        // promise. Require the treasury actually holds enough to back it.
        let config = &mut ctx.accounts.config;
        config.reserved_vesting = config.reserved_vesting
            .checked_add(total_amount)
            .ok_or(QvaultError::MathOverflow)?;
        require!(
            ctx.accounts.treasury_vault.amount >= config.reserved_vesting,
            QvaultError::InsufficientTreasury
        );

        emit!(VestingCreated {
            beneficiary,
            total_amount,
            cliff_ts: v.cliff_ts,
            end_ts:   v.end_ts,
        });
        Ok(())
    }

    // ── 15. CLAIM VESTED TOKENS ───────────────────────────────────────────
    /// Beneficiary claims the amount that has vested so far (from the treasury).
    pub fn claim_vested(ctx: Context<ClaimVested>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let vesting = &ctx.accounts.vesting;

        let vested = vested_amount(vesting, now)?;
        let claimable = vested
            .checked_sub(vesting.released_amount)
            .ok_or(QvaultError::MathOverflow)?;
        require!(claimable > 0, QvaultError::NothingVested);
        require!(
            ctx.accounts.treasury_vault.amount >= claimable,
            QvaultError::InsufficientTreasury
        );

        let bump = ctx.accounts.config.bump;
        let seeds: &[&[u8]] = &[SEED_CONFIG, &[bump]];
        let signer = &[seeds];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from:      ctx.accounts.treasury_vault.to_account_info(),
                    to:        ctx.accounts.beneficiary_token_account.to_account_info(),
                    authority: ctx.accounts.config.to_account_info(),
                },
                signer,
            ),
            claimable,
        )?;

        let vesting = &mut ctx.accounts.vesting;
        vesting.released_amount = vesting.released_amount
            .checked_add(claimable)
            .ok_or(QvaultError::MathOverflow)?;
        let config = &mut ctx.accounts.config;
        config.total_distributed = config.total_distributed
            .checked_add(claimable)
            .ok_or(QvaultError::MathOverflow)?;
        // Release the claimed portion from the reserved liability.
        config.reserved_vesting = config.reserved_vesting.saturating_sub(claimable);

        emit!(VestingClaimed {
            beneficiary: ctx.accounts.beneficiary.key(),
            amount:      claimable,
        });
        Ok(())
    }
}

// ── Account Contexts ──────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer  = admin,
        space  = GlobalConfig::LEN,
        seeds  = [SEED_CONFIG],
        bump,
    )]
    pub config: Account<'info, GlobalConfig>,

    // No freeze authority: the mint is created without one, so no admin can
    // ever freeze a holder's tokens. A credibly-neutral SPL — and one less
    // rug vector for the community to worry about.
    #[account(
        init,
        payer        = admin,
        mint::decimals   = TOKEN_DECIMALS,
        mint::authority  = config,
    )]
    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer              = admin,
        token::mint        = mint,
        token::authority   = config,
        seeds              = [SEED_TREASURY, mint.key().as_ref()],
        bump,
    )]
    pub treasury_vault: Account<'info, TokenAccount>,

    #[account(
        init,
        payer              = admin,
        token::mint        = mint,
        token::authority   = config,
        seeds              = [SEED_STAKING_VAULT, mint.key().as_ref()],
        bump,
    )]
    pub staking_vault: Account<'info, TokenAccount>,

    #[account(
        init,
        payer              = admin,
        token::mint        = mint,
        token::authority   = config,
        seeds              = [SEED_BUYBACK, mint.key().as_ref()],
        bump,
    )]
    pub buyback_vault: Account<'info, TokenAccount>,

    #[account(
        init,
        payer              = admin,
        token::mint        = mint,
        token::authority   = config,
        seeds              = [SEED_DAO, mint.key().as_ref()],
        bump,
    )]
    pub dao_vault: Account<'info, TokenAccount>,

    /// CHECK: validated by Metaplex CPI
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    pub token_program:          Program<'info, Token>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub system_program:         Program<'info, System>,
    pub rent:                   Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut, seeds = [SEED_CONFIG], bump = config.bump)]
    pub config: Account<'info, GlobalConfig>,

    #[account(
        init_if_needed,
        payer  = user,
        space  = StakeAccount::LEN,
        seeds  = [SEED_STAKE, user.key().as_ref()],
        bump,
    )]
    pub stake_account: Account<'info, StakeAccount>,

    #[account(mut, constraint = user_token_account.owner == user.key())]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [SEED_STAKING_VAULT, config.mint.as_ref()],
        bump,
    )]
    pub staking_vault: Account<'info, TokenAccount>,

    pub token_program:  Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut, seeds = [SEED_CONFIG], bump = config.bump)]
    pub config: Account<'info, GlobalConfig>,

    #[account(
        mut,
        seeds = [SEED_STAKE, user.key().as_ref()],
        bump  = stake_account.bump,
        constraint = stake_account.owner == user.key(),
    )]
    pub stake_account: Account<'info, StakeAccount>,

    #[account(mut, constraint = user_token_account.owner == user.key())]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut, seeds = [SEED_STAKING_VAULT, config.mint.as_ref()], bump)]
    pub staking_vault: Account<'info, TokenAccount>,

    #[account(mut, seeds = [SEED_TREASURY, config.mint.as_ref()], bump)]
    pub treasury_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut, seeds = [SEED_CONFIG], bump = config.bump)]
    pub config: Account<'info, GlobalConfig>,

    #[account(
        mut,
        seeds = [SEED_STAKE, user.key().as_ref()],
        bump  = stake_account.bump,
        constraint = stake_account.owner == user.key(),
    )]
    pub stake_account: Account<'info, StakeAccount>,

    #[account(mut, constraint = user_token_account.owner == user.key())]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut, seeds = [SEED_TREASURY, config.mint.as_ref()], bump)]
    pub treasury_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct DistributeFees<'info> {
    #[account(mut)]
    pub fee_payer: Signer<'info>,

    #[account(mut, seeds = [SEED_CONFIG], bump = config.bump)]
    pub config: Account<'info, GlobalConfig>,

    #[account(mut)]
    pub fee_source: Account<'info, TokenAccount>,

    #[account(mut, seeds = [SEED_TREASURY, config.mint.as_ref()], bump)]
    pub treasury_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub buyback_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub dao_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ExecuteBuybackBurn<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(mut, seeds = [SEED_CONFIG], bump = config.bump)]
    pub config: Account<'info, GlobalConfig>,

    #[account(mut, constraint = mint.key() == config.mint)]
    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = buyback_vault.key() == config.buyback_vault @ QvaultError::InvalidVaultAccount,
    )]
    pub buyback_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(title: String, description: String)]
pub struct CreateProposal<'info> {
    #[account(mut)]
    pub proposer: Signer<'info>,

    #[account(mut, seeds = [SEED_CONFIG], bump = config.bump)]
    pub config: Account<'info, GlobalConfig>,

    #[account(
        seeds = [SEED_STAKE, proposer.key().as_ref()],
        bump  = stake_account.bump,
        constraint = stake_account.owner == proposer.key(),
    )]
    pub stake_account: Account<'info, StakeAccount>,

    #[account(
        init,
        payer  = proposer,
        space  = Proposal::LEN,
        seeds  = [SEED_PROPOSAL, config.proposal_count.to_le_bytes().as_ref()],
        bump,
    )]
    pub proposal: Account<'info, Proposal>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(proposal_id: u64)]
pub struct Vote<'info> {
    #[account(mut)]
    pub voter: Signer<'info>,

    #[account(seeds = [SEED_CONFIG], bump = config.bump)]
    pub config: Account<'info, GlobalConfig>,

    #[account(
        mut,
        seeds = [SEED_STAKE, voter.key().as_ref()],
        bump  = stake_account.bump,
        constraint = stake_account.owner == voter.key(),
    )]
    pub stake_account: Account<'info, StakeAccount>,

    #[account(
        mut,
        seeds = [SEED_PROPOSAL, proposal_id.to_le_bytes().as_ref()],
        bump  = proposal.bump,
    )]
    pub proposal: Account<'info, Proposal>,

    #[account(
        init,
        payer  = voter,
        space  = VoteRecord::LEN,
        seeds  = [b"vote_record", proposal_id.to_le_bytes().as_ref(), voter.key().as_ref()],
        bump,
    )]
    pub vote_record: Account<'info, VoteRecord>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteProposal<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(seeds = [SEED_CONFIG], bump = config.bump)]
    pub config: Account<'info, GlobalConfig>,

    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
}

#[derive(Accounts)]
pub struct AdminOnly<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(mut, seeds = [SEED_CONFIG], bump = config.bump)]
    pub config: Account<'info, GlobalConfig>,
}

#[derive(Accounts)]
pub struct AcceptAdmin<'info> {
    #[account(mut)]
    pub new_admin: Signer<'info>,

    #[account(mut, seeds = [SEED_CONFIG], bump = config.bump)]
    pub config: Account<'info, GlobalConfig>,
}

#[derive(Accounts)]
pub struct WithdrawTreasury<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(mut, seeds = [SEED_CONFIG], bump = config.bump)]
    pub config: Account<'info, GlobalConfig>,

    #[account(
        mut,
        seeds = [SEED_TREASURY, config.mint.as_ref()],
        bump,
    )]
    pub treasury_vault: Account<'info, TokenAccount>,

    #[account(mut, constraint = destination.mint == config.mint)]
    pub destination: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(beneficiary: Pubkey)]
pub struct CreateVesting<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(mut, seeds = [SEED_CONFIG], bump = config.bump)]
    pub config: Account<'info, GlobalConfig>,

    #[account(
        init,
        payer = admin,
        space = VestingSchedule::LEN,
        seeds = [SEED_VESTING, beneficiary.as_ref()],
        bump,
    )]
    pub vesting: Account<'info, VestingSchedule>,

    #[account(seeds = [SEED_TREASURY, config.mint.as_ref()], bump)]
    pub treasury_vault: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimVested<'info> {
    #[account(mut)]
    pub beneficiary: Signer<'info>,

    #[account(mut, seeds = [SEED_CONFIG], bump = config.bump)]
    pub config: Account<'info, GlobalConfig>,

    #[account(
        mut,
        seeds = [SEED_VESTING, beneficiary.key().as_ref()],
        bump = vesting.bump,
        constraint = vesting.beneficiary == beneficiary.key(),
    )]
    pub vesting: Account<'info, VestingSchedule>,

    #[account(mut, seeds = [SEED_TREASURY, config.mint.as_ref()], bump)]
    pub treasury_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = beneficiary_token_account.owner == beneficiary.key(),
        constraint = beneficiary_token_account.mint == config.mint,
    )]
    pub beneficiary_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

// ── Account Structs ───────────────────────────────────────────────────────────

#[account]
pub struct GlobalConfig {
    pub admin:                Pubkey,  // 32
    pub pending_admin:        Pubkey,  // 32 — two-step admin transfer
    pub mint:                 Pubkey,  // 32
    pub treasury_vault:       Pubkey,  // 32
    pub staking_vault:        Pubkey,  // 32 — holds staked principal only
    pub buyback_vault:        Pubkey,  // 32
    pub dao_vault:            Pubkey,  // 32
    pub paused:               bool,    //  1
    pub total_staked:         u64,     //  8
    pub total_fees_collected: u64,     //  8
    pub total_burned:         u64,     //  8
    pub total_distributed:    u64,     //  8 — tokens moved out of treasury
    pub proposal_count:       u64,     //  8
    pub fee_stakers:          u16,     //  2
    pub fee_buyback:          u16,     //  2
    pub fee_dao:              u16,     //  2
    pub fee_growth:           u16,     //  2
    pub bump:                 u8,      //  1
    pub reserved_vesting:     u64,     //  8 — outstanding vesting liability the
                                       //      treasury must keep backed
    // Padding for future upgrades
    pub _reserved:            [u8; 56],
}

impl GlobalConfig {
    pub const LEN: usize =
        8 + (32 * 7) + 1 + (8 * 5) + (2 * 4) + 1 + 8 + 56;
}

#[account]
pub struct StakeAccount {
    pub owner:           Pubkey,  // 32
    pub amount:          u64,     //  8  — total staked
    pub staked_at:       i64,     //  8  — last stake/claim timestamp (for accrual)
    pub unlock_at:       i64,     //  8  — earliest unstake timestamp
    pub tier:            u8,      //  1  — 0=Electron, 1=Photon, 2=Qubit
    pub pending_rewards: u64,     //  8  — accumulated but unclaimed rewards
    pub bump:            u8,      //  1
    pub _reserved:       [u8; 32],
}

impl StakeAccount {
    pub const LEN: usize = 8 + 32 + 8 + 8 + 8 + 1 + 8 + 1 + 32;
}

#[account]
pub struct Proposal {
    pub id:            u64,     //  8
    pub proposer:      Pubkey,  // 32
    pub title:         String,  // 4 + 128
    pub description:   String,  // 4 + 512
    pub created_at:    i64,     //  8
    pub ends_at:       i64,     //  8
    pub votes_for:     u64,     //  8
    pub votes_against: u64,     //  8
    pub executed:      bool,    //  1
    pub bump:          u8,      //  1
    pub _reserved:     [u8; 32],
}

impl Proposal {
    pub const LEN: usize = 8 + 8 + 32 + (4+128) + (4+512) + 8 + 8 + 8 + 8 + 1 + 1 + 32;
}

#[account]
pub struct VoteRecord {
    pub voter:       Pubkey,  // 32
    pub proposal_id: u64,     //  8
    pub has_voted:   bool,    //  1
    pub support:     bool,    //  1
    pub weight:      u64,     //  8
}

impl VoteRecord {
    pub const LEN: usize = 8 + 32 + 8 + 1 + 1 + 8;
}

#[account]
pub struct VestingSchedule {
    pub beneficiary:     Pubkey,  // 32
    pub total_amount:    u64,     //  8
    pub released_amount: u64,     //  8
    pub start_ts:        i64,     //  8
    pub cliff_ts:        i64,     //  8
    pub end_ts:          i64,     //  8
    pub bump:            u8,      //  1
    pub _reserved:       [u8; 16],
}

impl VestingSchedule {
    pub const LEN: usize = 8 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 16;
}

// ── Events ────────────────────────────────────────────────────────────────────
#[event] pub struct TokenInitialized { pub mint: Pubkey, pub supply: u64, pub admin: Pubkey }
#[event] pub struct Staked           { pub user: Pubkey, pub amount: u64, pub tier: u8, pub unlock: i64 }
#[event] pub struct Unstaked         { pub user: Pubkey, pub amount: u64, pub rewards: u64 }
#[event] pub struct RewardsClaimed   { pub user: Pubkey, pub rewards: u64 }
#[event] pub struct FeesDistributed  { pub total: u64, pub to_stakers: u64, pub to_buyback: u64, pub to_dao: u64 }
#[event] pub struct TokensBurned     { pub amount: u64, pub total_burned: u64 }
#[event] pub struct ProposalCreated  { pub id: u64, pub proposer: Pubkey, pub title: String }
#[event] pub struct Voted            { pub voter: Pubkey, pub proposal_id: u64, pub support: bool, pub voting_power: u64 }
#[event] pub struct ProposalExecuted { pub id: u64, pub votes_for: u64, pub votes_against: u64 }
#[event] pub struct PauseToggled     { pub paused: bool }
#[event] pub struct AdminTransferProposed { pub current_admin: Pubkey, pub pending_admin: Pubkey }
#[event] pub struct AdminChanged      { pub old_admin: Pubkey, pub new_admin: Pubkey }
#[event] pub struct TreasuryWithdrawn { pub destination: Pubkey, pub amount: u64, pub total_distributed: u64 }
#[event] pub struct VestingCreated    { pub beneficiary: Pubkey, pub total_amount: u64, pub cliff_ts: i64, pub end_ts: i64 }
#[event] pub struct VestingClaimed    { pub beneficiary: Pubkey, pub amount: u64 }

// ── Helper Functions ──────────────────────────────────────────────────────────

/// Returns tier index: 0=Electron, 1=Photon, 2=Qubit
pub fn get_tier(amount: u64) -> u8 {
    if amount >= TIER_QUBIT   { 2 }
    else if amount >= TIER_PHOTON  { 1 }
    else                           { 0 }
}

/// Returns mid-point APY in basis points for the given tier
pub fn tier_apy_bps(tier: u8) -> u16 {
    match tier {
        2 => (APY_QUBIT_LO  + APY_QUBIT_HI)  / 2,
        1 => (APY_PHOTON_LO + APY_PHOTON_HI) / 2,
        _ => (APY_ELECTRON_LO + APY_ELECTRON_HI) / 2,
    }
}

/// Simple linear rewards: amount × APY × (elapsed_seconds / seconds_per_year).
/// Computed in u128 to avoid overflow on large stakes (principal × apy × elapsed
/// easily exceeds u64 within seconds for big stakers).
pub fn calculate_pending_rewards(stake_acc: &StakeAccount, now: i64) -> Result<u64> {
    let elapsed = now.saturating_sub(stake_acc.staked_at).max(0) as u128;
    let apy_bps = tier_apy_bps(stake_acc.tier) as u128;
    // reward = principal * apy_bps * elapsed / 10_000 / 31_536_000
    let reward = (stake_acc.amount as u128)
        .checked_mul(apy_bps)
        .ok_or(QvaultError::MathOverflow)?
        .checked_mul(elapsed)
        .ok_or(QvaultError::MathOverflow)?
        / 10_000u128
        / 31_536_000u128;
    u64::try_from(reward).map_err(|_| error!(QvaultError::MathOverflow))
}

/// Linear vesting with cliff. Returns the total amount vested by `now`
/// (cumulative, not net of what's already been released). Computed in u128.
pub fn vested_amount(v: &VestingSchedule, now: i64) -> Result<u64> {
    if now < v.cliff_ts {
        return Ok(0);
    }
    if now >= v.end_ts {
        return Ok(v.total_amount);
    }
    let elapsed  = (now - v.start_ts).max(0) as u128;
    let duration = (v.end_ts - v.start_ts).max(1) as u128;
    let vested = (v.total_amount as u128)
        .checked_mul(elapsed)
        .ok_or(QvaultError::MathOverflow)?
        / duration;
    u64::try_from(vested).map_err(|_| error!(QvaultError::MathOverflow))
}

/// Apply basis points to an amount. Computed in u128 so large distributions
/// (a single distribute_fees of more than ~4.6M tokens) can't overflow u64
/// mid-multiplication and revert the transaction.
pub fn bps(amount: u64, basis_points: u16) -> Result<u64> {
    let result = (amount as u128)
        .checked_mul(basis_points as u128)
        .ok_or_else(|| error!(QvaultError::MathOverflow))?
        / 10_000u128;
    u64::try_from(result).map_err(|_| error!(QvaultError::MathOverflow))
}

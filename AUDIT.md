# QVAULT — Internal Security & Feature Review

> Internal review by Claude (2026-06-07). **NOT a substitute for a professional
> audit** (OtterSec / Halborn / Trail of Bits) — that is still mandatory before
> mainnet. This documents findings and the remediations applied in-repo.

## Scope
`contracts/programs/qvault/src/lib.rs` — token mint, staking, fees, buyback/burn,
governance, and (new) distribution/vesting.

---

## Security findings & status

| # | Sev | Finding | Status |
|---|-----|---------|--------|
| 1 | 🔴 Critical | Reward math (`amount × apy × elapsed`) overflowed u64 within seconds/minutes, bricking unstake & claim for any non-trivial stake. | ✅ Fixed — computed in u128 (`calculate_pending_rewards`). |
| 2 | 🔴 High | `claim_rewards` / `unstake` zeroed `pending_rewards` even when the treasury couldn't pay → users silently lost rewards. | ✅ Fixed — claim now requires sufficient treasury (errors otherwise); unstake carries rewards over as pending. |
| 3 | 🟠 High | Lockup could be shortened: a 2nd stake with a shorter lockup reset `unlock_at`, unlocking previously locked tokens. | ✅ Fixed — `unlock_at` is now extend-only (`max`). |
| 4 | 🟠 High | Staking principal, treasury, and rewards shared ONE vault (commingled accounting). | ✅ Fixed — separate `staking_vault` PDA; treasury/buyback/dao are distinct PDAs. |
| 5 | 🟡 Medium | `distribute_fees` accepted arbitrary buyback/dao vaults → shares could be redirected. | ✅ Fixed — validated against config-registered vaults. |
| 6 | 🟡 Medium | Single-step admin transfer (typo = irrecoverable). | ✅ Fixed — two-step (`transfer_admin` + `accept_admin`). |
| 7 | 🟡 Medium | `execute_buyback_burn` burned from an unvalidated vault. | ✅ Fixed — vault constrained to `config.buyback_vault`. |
| 8 | 🟢 Low | Proposal title/description length unbounded (tx-level DoS). | ✅ Fixed — length checks. |
| 9 | 🟡 Medium | Governance `execute_proposal` is signaling-only (no on-chain action) and votes use live stake (flash-vote possible). | ⚠️ Documented, not changed. Real executable governance is a larger feature; revisit pre-mainnet. |
| 10 | 🟢 Info | "Quantum-resistant" is marketing narrative; contract is a standard SPL token. | By design (quantum L1 is Phase 3). |

---

## Feature gaps vs strategy & status

The tokenomics (Fair Launch 40%, Community 25% / 36mo, DAO 15%, Team 10% / 12mo
cliff, Liquidity 7%, Partners 3% / 6mo cliff, + airdrop) were **not executable**:
the entire 1B supply was minted to a treasury with **no way to move tokens out**.

| Need | Status |
|------|--------|
| Move tokens out of treasury (fair launch, Raydium liquidity, airdrops, ops) | ✅ Added `withdraw_treasury` (admin-gated, event-logged). |
| Vesting w/ cliff + linear release (Team / Community / Partners) | ✅ Added `create_vesting` + `claim_vested` (`VestingSchedule` PDA per beneficiary). |
| Separate allocation buckets | ⚠️ Modeled via withdraw + vesting + distinct vaults rather than hard-coded buckets. |
| Airdrop | ✅ Covered by `withdraw_treasury` (transfer to recipients); a batch helper can be added later. |

---

## Open recommendations (before mainnet)
1. **Professional audit** — mandatory.
2. **Multisig admin** (Squads) — `withdraw_treasury` makes the admin key a honeypot; it MUST be a multisig. Currently a single key on devnet.
3. **Reward funding model** — rewards are paid from the treasury (fixed supply). Decide and document the long-term reward budget; APY can't be met indefinitely from a finite pot.
4. **Executable governance** — wire `execute_proposal` to real actions (e.g. fee changes, treasury moves) and add vote snapshots / a lockup-during-vote rule to prevent flash-voting.
5. **Tests** — add Anchor integration tests covering every instruction (esp. vesting math, reward accrual, lockup, access control).

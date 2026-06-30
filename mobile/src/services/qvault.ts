/**
 * QVAULT staking — builds unsigned stake / unstake / claim transactions against
 * the on-chain program. Phantom signs + sends them; we never hold a key.
 *
 * We use Anchor only as an instruction encoder with a read-only provider (the
 * "wallet" never actually signs here — its sign methods are no-ops because the
 * real signing happens in Phantom).
 */
import {
  Connection,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import {
  PROGRAM_ID,
  QVLT_MINT,
  QVLT_DECIMALS,
  SEED_CONFIG,
  SEED_STAKE,
  SEED_STAKING_VAULT,
  SEED_TREASURY,
  TIERS,
} from "../constants";
import { connection } from "./solana";
import idl from "../idl/qvault.json";

function readOnlyProgram(owner: PublicKey): Program {
  const wallet = {
    publicKey: owner,
    signTransaction: async (t: any) => t,
    signAllTransactions: async (t: any) => t,
  };
  const provider = new AnchorProvider(connection as Connection, wallet as any, {
    commitment: "confirmed",
  });
  return new Program(idl as any, provider);
}

function pda(seeds: (Buffer | Uint8Array)[]): PublicKey {
  return PublicKey.findProgramAddressSync(seeds, PROGRAM_ID)[0];
}

export const configPda = () => pda([Buffer.from(SEED_CONFIG)]);
export const stakePda = (owner: PublicKey) =>
  pda([Buffer.from(SEED_STAKE), owner.toBuffer()]);
export const stakingVaultPda = () =>
  pda([Buffer.from(SEED_STAKING_VAULT), QVLT_MINT.toBuffer()]);
export const treasuryPda = () =>
  pda([Buffer.from(SEED_TREASURY), QVLT_MINT.toBuffer()]);

export type StakeInfo = {
  amount: number;
  tier: number;
  tierName: string;
  unlockAt: number;
  pendingRewards: number;
};

/** Read the user's stake account, or null if they have never staked. */
export async function getStakeInfo(owner: PublicKey): Promise<StakeInfo | null> {
  try {
    const program = readOnlyProgram(owner);
    const acc: any = await (program.account as any).stakeAccount.fetch(
      stakePda(owner)
    );
    const amount = Number(acc.amount) / 10 ** QVLT_DECIMALS;
    const tier = Number(acc.tier);
    return {
      amount,
      tier,
      tierName: TIERS[tier]?.name ?? "—",
      unlockAt: Number(acc.unlockAt),
      pendingRewards: Number(acc.pendingRewards) / 10 ** QVLT_DECIMALS,
    };
  } catch {
    return null;
  }
}

async function finalize(tx: Transaction, owner: PublicKey): Promise<Transaction> {
  tx.feePayer = owner;
  const { blockhash } = await connection.getLatestBlockhash("finalized");
  tx.recentBlockhash = blockhash;
  return tx;
}

export async function buildStakeTx(
  owner: PublicKey,
  amountQvlt: number,
  lockupDays: number
): Promise<Transaction> {
  const program = readOnlyProgram(owner);
  const userAta = await getAssociatedTokenAddress(QVLT_MINT, owner);
  const raw = new BN(Math.round(amountQvlt * 10 ** QVLT_DECIMALS).toString());
  const tx: Transaction = await (program.methods as any)
    .stake(raw, lockupDays)
    .accounts({
      user: owner,
      config: configPda(),
      stakeAccount: stakePda(owner),
      userTokenAccount: userAta,
      stakingVault: stakingVaultPda(),
    })
    .transaction();
  return finalize(tx, owner);
}

export async function buildUnstakeTx(
  owner: PublicKey,
  amountQvlt: number
): Promise<Transaction> {
  const program = readOnlyProgram(owner);
  const userAta = await getAssociatedTokenAddress(QVLT_MINT, owner);
  const raw = new BN(Math.round(amountQvlt * 10 ** QVLT_DECIMALS).toString());
  const tx: Transaction = await (program.methods as any)
    .unstake(raw)
    .accounts({
      user: owner,
      config: configPda(),
      stakeAccount: stakePda(owner),
      userTokenAccount: userAta,
      stakingVault: stakingVaultPda(),
      treasuryVault: treasuryPda(),
    })
    .transaction();
  return finalize(tx, owner);
}

export async function buildClaimTx(owner: PublicKey): Promise<Transaction> {
  const program = readOnlyProgram(owner);
  const userAta = await getAssociatedTokenAddress(QVLT_MINT, owner);
  const tx: Transaction = await (program.methods as any)
    .claimRewards()
    .accounts({
      user: owner,
      config: configPda(),
      stakeAccount: stakePda(owner),
      userTokenAccount: userAta,
      treasuryVault: treasuryPda(),
    })
    .transaction();
  return finalize(tx, owner);
}

export function tierForAmount(amountQvlt: number) {
  if (amountQvlt >= TIERS[2].min) return TIERS[2];
  if (amountQvlt >= TIERS[1].min) return TIERS[1];
  if (amountQvlt >= TIERS[0].min) return TIERS[0];
  return null;
}

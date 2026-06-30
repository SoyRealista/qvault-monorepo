import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { RPC_ENDPOINT, QVLT_MINT, QVLT_DECIMALS } from "../constants";

export const connection = new Connection(RPC_ENDPOINT, "confirmed");

export type Balances = {
  sol: number;
  qvlt: number;
};

/** Read SOL + QVLT balances for a wallet. Missing token account → 0 QVLT. */
export async function getBalances(owner: PublicKey): Promise<Balances> {
  const lamports = await connection.getBalance(owner);
  let qvlt = 0;
  try {
    const ata = await getAssociatedTokenAddress(QVLT_MINT, owner);
    const acc = await getAccount(connection, ata);
    qvlt = Number(acc.amount) / 10 ** QVLT_DECIMALS;
  } catch {
    qvlt = 0; // no token account yet
  }
  return { sol: lamports / LAMPORTS_PER_SOL, qvlt };
}

export type TxSummary = {
  signature: string;
  time: number | null;
  err: boolean;
};

/** Recent transaction signatures for a wallet (lightweight history). */
export async function getRecentActivity(
  owner: PublicKey,
  limit = 15
): Promise<TxSummary[]> {
  const sigs = await connection.getSignaturesForAddress(owner, { limit });
  return sigs.map((s) => ({
    signature: s.signature,
    time: s.blockTime ?? null,
    err: s.err != null,
  }));
}

/** Build an unsigned SOL transfer (signed later by Phantom). */
export async function buildSolTransfer(
  from: PublicKey,
  to: PublicKey,
  amountSol: number
): Promise<Transaction> {
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: from,
      toPubkey: to,
      lamports: Math.round(amountSol * LAMPORTS_PER_SOL),
    })
  );
  return finalize(tx, from);
}

/** Build an unsigned QVLT transfer, creating the recipient ATA if needed. */
export async function buildQvltTransfer(
  from: PublicKey,
  to: PublicKey,
  amountQvlt: number
): Promise<Transaction> {
  const fromAta = await getAssociatedTokenAddress(QVLT_MINT, from);
  const toAta = await getAssociatedTokenAddress(QVLT_MINT, to);
  const tx = new Transaction();

  // Create the recipient's token account if it doesn't exist yet.
  try {
    await getAccount(connection, toAta);
  } catch {
    tx.add(
      createAssociatedTokenAccountInstruction(
        from, // payer
        toAta,
        to,
        QVLT_MINT,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  const raw = BigInt(Math.round(amountQvlt * 10 ** QVLT_DECIMALS));
  tx.add(createTransferInstruction(fromAta, toAta, from, raw));
  return finalize(tx, from);
}

async function finalize(tx: Transaction, feePayer: PublicKey): Promise<Transaction> {
  tx.feePayer = feePayer;
  const { blockhash } = await connection.getLatestBlockhash("finalized");
  tx.recentBlockhash = blockhash;
  return tx;
}

export function isValidAddress(addr: string): boolean {
  try {
    new PublicKey(addr);
    return true;
  } catch {
    return false;
  }
}

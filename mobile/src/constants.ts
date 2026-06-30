import { PublicKey } from "@solana/web3.js";

// ── Network ────────────────────────────────────────────────────────────────
// Until mainnet genesis (7 Jul 2026) the program lives on devnet. Flip CLUSTER
// to "mainnet-beta" + set the mainnet mint on launch day.
export type Cluster = "devnet" | "mainnet-beta";
// `as Cluster` keeps the union type so launch-day comparisons typecheck (a bare
// literal would narrow to "devnet" and make the mainnet branch "unreachable").
export const CLUSTER = "devnet" as Cluster;

export const RPC_ENDPOINT =
  CLUSTER === "mainnet-beta"
    ? "https://api.mainnet-beta.solana.com"
    : "https://api.devnet.solana.com";

// ── QVAULT program / token ───────────────────────────────────────────────────
export const PROGRAM_ID = new PublicKey(
  "BLTxBWAv3JwewqX8U3TuNBPuTBUyaCd8DSQP1DVGhQiY"
);

// Devnet test mint (from the flow harness). Replace with the real mint that the
// initialize() instruction creates on mainnet launch day.
export const QVLT_MINT = new PublicKey(
  "BDCWoQDcd4D3xhn7vBQ6vxyKb8H3EocShXgYcwdT4yDd"
);

export const QVLT_DECIMALS = 9;
export const SOL_DECIMALS = 9;

// Staking tier thresholds (whole QVLT) — mirror the on-chain contract.
export const TIERS = [
  { name: "Electron", min: 10_000, icon: "⚡" },
  { name: "Photon", min: 50_000, icon: "🔆" },
  { name: "Qubit", min: 250_000, icon: "🧊" },
];

// PDA seeds (must match the Rust program)
export const SEED_CONFIG = "qvault_config";
export const SEED_STAKE = "stake_account";
export const SEED_STAKING_VAULT = "staking_vault";
export const SEED_TREASURY = "treasury";

// ── Links ────────────────────────────────────────────────────────────────────
export const LINKS = {
  website: "https://qvlt.xyz",
  x: "https://x.com/TheQVault",
  telegram: "https://t.me/", // TODO: set once the channel exists
  explorerTx: (sig: string) =>
    `https://solscan.io/tx/${sig}${CLUSTER === "devnet" ? "?cluster=devnet" : ""}`,
  explorerAddr: (addr: string) =>
    `https://solscan.io/account/${addr}${CLUSTER === "devnet" ? "?cluster=devnet" : ""}`,
  buyRaydium: "https://raydium.io/swap/",
};

// Phantom universal-link base (works on iOS + Android)
export const PHANTOM_UL = "https://phantom.app/ul/v1";

// Deep-link scheme the app registers (see app.json "scheme")
export const APP_SCHEME = "qvault";

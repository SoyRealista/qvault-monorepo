/**
 * QVAULT guided deploy / initialize / vesting-setup script.
 *
 * This DOES NOT deploy the program binary itself — do that with the Anchor CLI:
 *     anchor build
 *     anchor deploy --provider.cluster <devnet|mainnet>
 * This script handles the ON-CHAIN SETUP after the program is deployed:
 *   1. initialize  (mint 1B, create treasury/staking/buyback/dao vaults, metadata)
 *   2. create_vesting for each entry in deploy.config.json
 *   3. prints a summary + the remaining manual launch steps
 *
 * Usage:
 *   ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
 *   ANCHOR_WALLET=$HOME/my-solana-wallet/my-keypair.json \
 *   npx ts-node scripts/deploy.ts            # full setup
 *   ... npx ts-node scripts/deploy.ts --vesting-only
 *   ... npx ts-node scripts/deploy.ts --dry-run
 *
 * MAINNET SAFETY: against mainnet the script refuses to run unless BOTH
 *   QVAULT_AUDIT_OK=yes   (you confirm a professional audit is complete)
 *   QVAULT_MULTISIG=<pubkey>  (admin will be handed to this Squads multisig)
 * are set. It will also nominate the multisig as pending admin at the end.
 */
import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAccount } from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";

const MPL = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
const BN = anchor.BN;
const DEC = 1_000_000_000n;
const MONTH = 30 * 24 * 3600;
const toRaw = (n: number) => new BN((BigInt(n) * DEC).toString());
const fromRaw = (x: any) => Number(BigInt(x.toString()) / 1_000_000n) / 1000;
const pda = (pid: PublicKey, s: string, e?: Buffer) =>
  PublicKey.findProgramAddressSync(e ? [Buffer.from(s), e] : [Buffer.from(s)], pid)[0];

const argv = process.argv.slice(2);
const DRY = argv.includes("--dry-run");
const VESTING_ONLY = argv.includes("--vesting-only");

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const idl = JSON.parse(fs.readFileSync(path.join(process.cwd(), "target/idl/qvault.json"), "utf8"));
  const program = new anchor.Program(idl, provider);
  const conn = provider.connection;
  const admin = provider.wallet.publicKey;
  const endpoint = (conn as any)._rpcEndpoint as string;
  const isMainnet = /mainnet/.test(endpoint);

  console.log("── QVAULT deploy/setup ──────────────────────────────");
  console.log("Cluster :", endpoint, isMainnet ? "  ⚠️  MAINNET" : "");
  console.log("Admin   :", admin.toBase58());
  console.log("Program :", program.programId.toBase58());
  console.log("Mode    :", DRY ? "DRY-RUN" : VESTING_ONLY ? "VESTING-ONLY" : "FULL", "\n");

  // ── Mainnet safety gate ────────────────────────────────────────────
  if (isMainnet) {
    const auditOk = process.env.QVAULT_AUDIT_OK === "yes";
    const multisig = process.env.QVAULT_MULTISIG;
    if (!auditOk || !multisig) {
      console.error("🛑 MAINNET BLOCKED. Required before mainnet:");
      console.error("   - Professional audit complete → set QVAULT_AUDIT_OK=yes");
      console.error("   - Squads multisig pubkey      → set QVAULT_MULTISIG=<pubkey>");
      process.exit(1);
    }
    try { new PublicKey(multisig); } catch { console.error("🛑 QVAULT_MULTISIG is not a valid pubkey"); process.exit(1); }
    console.log("✅ mainnet gates passed; admin will be nominated to multisig:", multisig, "\n");
  }

  const config = pda(program.programId, "qvault_config");

  // ── 1. INITIALIZE ───────────────────────────────────────────────────
  let cfg: any = await (program.account as any).globalConfig.fetchNullable(config);
  if (!cfg && !VESTING_ONLY) {
    const mintKp = Keypair.generate();
    const mint = mintKp.publicKey;
    const accts = {
      admin, config, mint,
      treasuryVault: pda(program.programId, "treasury", mint.toBuffer()),
      stakingVault: pda(program.programId, "staking_vault", mint.toBuffer()),
      buybackVault: pda(program.programId, "buyback_vault", mint.toBuffer()),
      daoVault: pda(program.programId, "dao_vault", mint.toBuffer()),
      metadata: pda(MPL, "metadata", undefined) /* placeholder, set below */,
    } as any;
    accts.metadata = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), MPL.toBuffer(), mint.toBuffer()], MPL)[0];
    console.log("[1] initialize → mint", mint.toBase58());
    if (DRY) {
      console.log("    (dry-run, skipping tx)");
    } else {
      await program.methods.initialize().accountsPartial({
        ...accts, tokenProgram: TOKEN_PROGRAM_ID, tokenMetadataProgram: MPL,
        systemProgram: SystemProgram.programId, rent: SYSVAR_RENT_PUBKEY,
      }).signers([mintKp]).rpc();
      // persist the mint keypair (program/token identity) for the record
      const out = `mint-keypair-${mint.toBase58().slice(0, 6)}.json`;
      fs.writeFileSync(out, JSON.stringify(Array.from(mintKp.secretKey)));
      console.log("    ✅ initialized. Mint keypair saved to", out, "(BACK THIS UP, gitignored)");
      cfg = await (program.account as any).globalConfig.fetch(config);
    }
  } else if (cfg) {
    console.log("[1] already initialized — mint", cfg.mint.toBase58());
  }
  if (!cfg) { console.log("\n(dry-run with no existing config — stopping before vesting)"); return; }

  const mint: PublicKey = cfg.mint;
  const treasury = pda(program.programId, "treasury", mint.toBuffer());
  console.log("    treasury balance:", fromRaw((await getAccount(conn, treasury)).amount), "QVLT\n");

  // ── 2. VESTING SCHEDULES ────────────────────────────────────────────
  const cfgPath = path.join(process.cwd(), "scripts/deploy.config.json");
  if (fs.existsSync(cfgPath)) {
    const plan = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
    for (const v of plan.vesting || []) {
      let bene: PublicKey;
      try { bene = new PublicKey(v.beneficiary); }
      catch { console.log(`[2] ⏭️  ${v.label}: invalid/placeholder beneficiary, skipping`); continue; }
      const vPda = pda(program.programId, "vesting", bene.toBuffer());
      const exists = await (program.account as any).vestingSchedule.fetchNullable(vPda);
      if (exists) { console.log(`[2] ⏭️  ${v.label}: vesting already exists`); continue; }
      console.log(`[2] create_vesting → ${v.label}: ${v.amount} QVLT to ${bene.toBase58()}`);
      if (DRY) { console.log("    (dry-run)"); continue; }
      await program.methods.createVesting(
        bene, toRaw(v.amount), new BN(v.cliffMonths * MONTH), new BN(v.durationMonths * MONTH)
      ).accountsPartial({ admin, config, vesting: vPda, systemProgram: SystemProgram.programId }).rpc();
      console.log("    ✅ done");
    }
  } else {
    console.log("[2] no scripts/deploy.config.json — skipping vesting (copy deploy.config.example.json)");
  }

  // ── 3. MAINNET: nominate multisig as admin (two-step) ───────────────
  if (isMainnet && !DRY) {
    const multisig = new PublicKey(process.env.QVAULT_MULTISIG!);
    console.log("\n[3] transfer_admin → nominate multisig", multisig.toBase58());
    await program.methods.transferAdmin(multisig).accountsPartial({ admin, config }).rpc();
    console.log("    ✅ nominated. The multisig must call accept_admin to take control.");
  }

  console.log("\n── Remaining manual launch steps ────────────────────");
  console.log(" • Publish IDL on-chain:  anchor idl init/upgrade <programId> -f target/idl/qvault.json");
  console.log(" • Seed & LOCK the Raydium liquidity pool (use withdraw_treasury for the LP tokens).");
  console.log(" • Verify all authorities are held by the multisig.");
  console.log("✅ setup script finished.");
}

main().then(() => process.exit(0)).catch((e) => { console.error("❌", e); process.exit(1); });

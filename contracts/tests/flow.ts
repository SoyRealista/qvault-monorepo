/**
 * QVAULT devnet flow test — exercises the v2 contract end-to-end.
 * Run: ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
 *      ANCHOR_WALLET=~/my-solana-wallet/my-keypair.json npm run flow
 */
import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount, getAccount,
} from "@solana/spl-token";
import * as fs from "fs";
import idl from "../target/idl/qvault.json";

const MPL = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
const BN = anchor.BN;
const e9 = (n: number) => new BN(BigInt(n) * 1_000_000_000n);
const fmt = (x: any) => (Number(BigInt(x.toString()) / 1_000_000n) / 1000).toLocaleString() + " QVLT";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pda = (seeds: (Buffer | Uint8Array)[], pid: PublicKey) =>
  PublicKey.findProgramAddressSync(seeds, pid)[0];

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = new anchor.Program(idl as anchor.Idl, provider);
  const conn = provider.connection;
  const admin = provider.wallet.publicKey;
  const adminKp = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(process.env.ANCHOR_WALLET!.replace(/^~/, process.env.HOME!), "utf8")))
  );
  console.log("Program:", program.programId.toBase58());
  console.log("Admin:  ", admin.toBase58());

  const config = pda([Buffer.from("qvault_config")], program.programId);

  // ── 1. INITIALIZE (only if not already done) ──────────────────────────
  let cfg: any = await (program.account as any).globalConfig.fetchNullable(config);
  if (!cfg) {
    const mintKp = Keypair.generate();
    const mint = mintKp.publicKey;
    const acc = {
      admin, config, mint,
      treasuryVault: pda([Buffer.from("treasury"), mint.toBuffer()], program.programId),
      stakingVault:  pda([Buffer.from("staking_vault"), mint.toBuffer()], program.programId),
      buybackVault:  pda([Buffer.from("buyback_vault"), mint.toBuffer()], program.programId),
      daoVault:      pda([Buffer.from("dao_vault"), mint.toBuffer()], program.programId),
      metadata:      pda([Buffer.from("metadata"), MPL.toBuffer(), mint.toBuffer()], MPL),
      tokenProgram: TOKEN_PROGRAM_ID, tokenMetadataProgram: MPL,
      systemProgram: SystemProgram.programId, rent: SYSVAR_RENT_PUBKEY,
    };
    console.log("\n[1] initialize — minting 1B QVLT, mint =", mint.toBase58());
    const sig = await program.methods.initialize().accountsPartial(acc).signers([mintKp]).rpc();
    console.log("    ✅ tx", sig);
    cfg = await (program.account as any).globalConfig.fetch(config);
  } else {
    console.log("\n[1] already initialized — reusing existing token");
  }
  const mint: PublicKey = cfg.mint;
  const treasury = pda([Buffer.from("treasury"), mint.toBuffer()], program.programId);
  const stakingVault = pda([Buffer.from("staking_vault"), mint.toBuffer()], program.programId);
  console.log("    mint:", mint.toBase58());
  console.log("    treasury balance:", fmt((await getAccount(conn, treasury)).amount));

  // Admin token account
  const adminAta = (await getOrCreateAssociatedTokenAccount(conn, adminKp, mint, admin)).address;

  // ── 2. WITHDRAW TREASURY → admin ATA ──────────────────────────────────
  console.log("\n[2] withdraw_treasury 30,000 QVLT → admin ATA");
  await program.methods.withdrawTreasury(e9(30_000)).accountsPartial({
    admin, config, treasuryVault: treasury, destination: adminAta, tokenProgram: TOKEN_PROGRAM_ID,
  }).rpc();
  console.log("    ✅ admin ATA balance:", fmt((await getAccount(conn, adminAta)).amount));

  // ── 3. STAKE 15,000 (lockup 0) ────────────────────────────────────────
  const stakeAcc = pda([Buffer.from("stake_account"), admin.toBuffer()], program.programId);
  console.log("\n[3] stake 15,000 QVLT");
  await program.methods.stake(e9(15_000), 0).accountsPartial({
    user: admin, config, stakeAccount: stakeAcc, userTokenAccount: adminAta,
    stakingVault, tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId,
  }).rpc();
  let sa: any = await (program.account as any).stakeAccount.fetch(stakeAcc);
  console.log(`    ✅ staked ${fmt(sa.amount)} | tier ${sa.tier} | staking_vault ${fmt((await getAccount(conn, stakingVault)).amount)}`);

  // ── 4. UNSTAKE 15,000 ─────────────────────────────────────────────────
  console.log("\n[4] unstake 15,000 QVLT (lockup 0 → immediate)");
  await program.methods.unstake(e9(15_000)).accountsPartial({
    user: admin, config, stakeAccount: stakeAcc, userTokenAccount: adminAta,
    stakingVault, treasuryVault: treasury, tokenProgram: TOKEN_PROGRAM_ID,
  }).rpc();
  sa = await (program.account as any).stakeAccount.fetch(stakeAcc);
  console.log(`    ✅ remaining staked ${fmt(sa.amount)} | admin ATA ${fmt((await getAccount(conn, adminAta)).amount)}`);

  // ── 5. VESTING: create (5,000, cliff 0, 60s) then claim after 8s ───────
  const vesting = pda([Buffer.from("vesting"), admin.toBuffer()], program.programId);
  const existing = await (program.account as any).vestingSchedule.fetchNullable(vesting);
  if (!existing) {
    console.log("\n[5] create_vesting 5,000 QVLT (cliff 0, duration 60s) for admin");
    await program.methods.createVesting(admin, e9(5_000), new BN(0), new BN(60)).accountsPartial({
      admin, config, vesting, treasuryVault: treasury, systemProgram: SystemProgram.programId,
    }).rpc();
    console.log("    ✅ vesting created");
  } else {
    console.log("\n[5] vesting already exists — skipping create");
  }
  console.log("    waiting 8s for linear vesting to accrue...");
  await sleep(8000);
  const before = (await getAccount(conn, adminAta)).amount;
  await program.methods.claimVested().accountsPartial({
    beneficiary: admin, config, vesting, treasuryVault: treasury,
    beneficiaryTokenAccount: adminAta, tokenProgram: TOKEN_PROGRAM_ID,
  }).rpc();
  const after = (await getAccount(conn, adminAta)).amount;
  const v: any = await (program.account as any).vestingSchedule.fetch(vesting);
  console.log(`    ✅ claimed ${fmt(after - before)} | released so far ${fmt(v.releasedAmount)} of ${fmt(v.totalAmount)}`);

  console.log("\n🎉 Flow OK — all instructions executed on devnet.");
}

main().then(() => process.exit(0)).catch((e) => { console.error("❌", e); process.exit(1); });

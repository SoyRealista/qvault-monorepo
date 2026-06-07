/**
 * QVAULT integration tests (run against the deployed devnet program).
 * Run: ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
 *      ANCHOR_WALLET=$HOME/my-solana-wallet/my-keypair.json npm test
 *
 * Note: the protocol config is a singleton; these tests assume `initialize`
 * has already run (see tests/flow.ts) and assert on state deltas.
 */
import anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount, getAccount,
} from "@solana/spl-token";
import { assert } from "chai";
import * as fs from "fs";
import * as path from "path";
const idl = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "target/idl/qvault.json"), "utf8")
);

const BN = anchor.BN;
const DEC = 1_000_000_000n;
const toRaw = (n: number) => new BN((BigInt(n) * DEC).toString());
const fromRaw = (x: any) => Number(BigInt(x.toString()) / 1_000_000n) / 1000;
const seed = (pid: PublicKey, s: string, e?: Buffer) =>
  PublicKey.findProgramAddressSync(e ? [Buffer.from(s), e] : [Buffer.from(s)], pid)[0];

describe("qvault (devnet integration)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = new anchor.Program(idl as anchor.Idl, provider);
  const me = provider.wallet.publicKey;
  const adminKp = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(process.env.ANCHOR_WALLET!.replace(/^~/, process.env.HOME!), "utf8")))
  );
  const config = seed(program.programId, "qvault_config");
  let mint: PublicKey, treasury: PublicKey, stakingVault: PublicKey, ata: PublicKey, stakeAccPda: PublicKey;

  before(async () => {
    const cfg: any = await (program.account as any).globalConfig.fetch(config);
    mint = cfg.mint;
    treasury = seed(program.programId, "treasury", mint.toBuffer());
    stakingVault = seed(program.programId, "staking_vault", mint.toBuffer());
    stakeAccPda = seed(program.programId, "stake_account", me.toBuffer());
    ata = (await getOrCreateAssociatedTokenAccount(provider.connection, adminKp, mint, me)).address;
    const bal = fromRaw((await getAccount(provider.connection, ata)).amount);
    if (bal < 20_000) {
      await program.methods.withdrawTreasury(toRaw(50_000)).accountsPartial({
        admin: me, config, treasuryVault: treasury, destination: ata, tokenProgram: TOKEN_PROGRAM_ID,
      }).rpc();
    }
  });

  it("rejects a stake below the minimum tier", async () => {
    try {
      await program.methods.stake(toRaw(100), 0).accountsPartial({
        user: me, config, stakeAccount: stakeAccPda, userTokenAccount: ata,
        stakingVault, tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId,
      }).rpc();
      assert.fail("expected BelowMinimumStake");
    } catch (e: any) {
      assert.include(e.toString(), "BelowMinimumStake");
    }
  });

  it("stakes 12,000 QVLT → Electron tier, vault grows", async () => {
    const prev = await (program.account as any).stakeAccount.fetchNullable(stakeAccPda);
    const prevAmt = prev ? fromRaw(prev.amount) : 0;
    const vaultBefore = fromRaw((await getAccount(provider.connection, stakingVault)).amount);
    await program.methods.stake(toRaw(12_000), 0).accountsPartial({
      user: me, config, stakeAccount: stakeAccPda, userTokenAccount: ata,
      stakingVault, tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId,
    }).rpc();
    const sa: any = await (program.account as any).stakeAccount.fetch(stakeAccPda);
    assert.equal(fromRaw(sa.amount), prevAmt + 12_000, "stake +12,000");
    assert.equal(sa.tier, 0, "Electron tier");
    assert.equal(fromRaw((await getAccount(provider.connection, stakingVault)).amount), vaultBefore + 12_000, "vault +12,000");
  });

  it("unstakes all (lockup 0) and returns principal", async () => {
    const sa: any = await (program.account as any).stakeAccount.fetch(stakeAccPda);
    const amt = fromRaw(sa.amount);
    const ataBefore = fromRaw((await getAccount(provider.connection, ata)).amount);
    await program.methods.unstake(toRaw(amt)).accountsPartial({
      user: me, config, stakeAccount: stakeAccPda, userTokenAccount: ata,
      stakingVault, treasuryVault: treasury, tokenProgram: TOKEN_PROGRAM_ID,
    }).rpc();
    const after: any = await (program.account as any).stakeAccount.fetch(stakeAccPda);
    assert.equal(fromRaw(after.amount), 0, "fully unstaked");
    assert.isAtLeast(fromRaw((await getAccount(provider.connection, ata)).amount), ataBefore + amt - 0.001, "principal returned");
  });

  it("vesting never over-releases and is monotonic", async () => {
    const vPda = seed(program.programId, "vesting", me.toBuffer());
    const existing = await (program.account as any).vestingSchedule.fetchNullable(vPda);
    if (!existing) {
      await program.methods.createVesting(me, toRaw(1_000), new BN(0), new BN(120)).accountsPartial({
        admin: me, config, vesting: vPda, systemProgram: SystemProgram.programId,
      }).rpc();
    }
    const v1: any = await (program.account as any).vestingSchedule.fetch(vPda);
    try {
      await program.methods.claimVested().accountsPartial({
        beneficiary: me, config, vesting: vPda, treasuryVault: treasury,
        beneficiaryTokenAccount: ata, tokenProgram: TOKEN_PROGRAM_ID,
      }).rpc();
    } catch (e: any) {
      // NothingVested is acceptable if fully released already
      if (!e.toString().includes("NothingVested")) throw e;
    }
    const v2: any = await (program.account as any).vestingSchedule.fetch(vPda);
    assert.isAtLeast(fromRaw(v2.releasedAmount), fromRaw(v1.releasedAmount), "released is monotonic");
    assert.isAtMost(fromRaw(v2.releasedAmount), fromRaw(v2.totalAmount), "never over-releases");
  });
});

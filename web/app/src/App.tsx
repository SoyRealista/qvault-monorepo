import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useConnection,
  useAnchorWallet,
  useWallet,
} from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getAccount,
} from "@solana/spl-token";
import idl from "./idl/qvault.json";

const PROGRAM_ID = new PublicKey((idl as any).address);
const TIERS = ["Electron", "Photon", "Qubit"];
const DEC = 1_000_000_000n;

const toRaw = (qvlt: string) =>
  new BN((BigInt(Math.max(0, Math.floor(Number(qvlt) || 0))) * DEC).toString());
const fromRaw = (x: any) =>
  Number(BigInt(x.toString()) / 1_000_000n) / 1000;
const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 3 });

const seed = (s: string, extra?: Buffer) =>
  PublicKey.findProgramAddressSync(
    extra ? [Buffer.from(s), extra] : [Buffer.from(s)],
    PROGRAM_ID
  )[0];

export default function App() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const { publicKey } = useWallet();

  const [amount, setAmount] = useState("10000");
  const [lockup, setLockup] = useState("30");
  const [s, setS] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const program = useMemo(() => {
    if (!wallet) return null;
    const provider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    return new Program(idl as any, provider);
  }, [connection, wallet]);

  const config = useMemo(() => seed("qvault_config"), []);

  const refresh = useCallback(async () => {
    if (!program || !publicKey) return;
    try {
      const cfg: any = await (program.account as any).globalConfig.fetch(config);
      const mint: PublicKey = cfg.mint;
      const stakingVault = seed("staking_vault", mint.toBuffer());
      const treasury = seed("treasury", mint.toBuffer());
      const stakeAccPda = seed("stake_account", publicKey.toBuffer());
      const ata = getAssociatedTokenAddressSync(mint, publicKey);
      let balance = 0;
      try {
        balance = fromRaw((await getAccount(connection, ata)).amount);
      } catch {}
      let stake: any = null;
      try {
        stake = await (program.account as any).stakeAccount.fetch(stakeAccPda);
      } catch {}
      const vestingPda = seed("vesting", publicKey.toBuffer());
      let vesting: any = null;
      try {
        vesting = await (program.account as any).vestingSchedule.fetch(vestingPda);
      } catch {}
      setS({
        mint,
        ata,
        stakeAccPda,
        stakingVault,
        treasury,
        balance,
        stake,
        vestingPda,
        vesting,
        totalStaked: fromRaw(cfg.totalStaked),
        totalBurned: fromRaw(cfg.totalBurned),
        paused: cfg.paused,
      });
      setMsg("");
    } catch (e: any) {
      setMsg("⚠️ No se pudo leer el contrato (¿inicializado en esta red?): " + (e.message || e));
    }
  }, [program, publicKey, connection, config]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const run = async (label: string, fn: () => Promise<string>) => {
    if (!program || !publicKey || !s) return;
    setBusy(true);
    setMsg(label + "…");
    try {
      const sig = await fn();
      setMsg(`✅ ${label} OK — ${sig.slice(0, 12)}…`);
      await refresh();
    } catch (e: any) {
      setMsg(`❌ ${label}: ` + (e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const stake = () =>
    run("Stake", () =>
      program!.methods
        .stake(toRaw(amount), Number(lockup))
        .accountsPartial({
          user: publicKey!,
          config,
          stakeAccount: s.stakeAccPda,
          userTokenAccount: s.ata,
          stakingVault: s.stakingVault,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
    );

  const unstake = () =>
    run("Unstake", () =>
      program!.methods
        .unstake(toRaw(amount))
        .accountsPartial({
          user: publicKey!,
          config,
          stakeAccount: s.stakeAccPda,
          userTokenAccount: s.ata,
          stakingVault: s.stakingVault,
          treasuryVault: s.treasury,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc()
    );

  const claim = () =>
    run("Claim", () =>
      program!.methods
        .claimRewards()
        .accountsPartial({
          user: publicKey!,
          config,
          stakeAccount: s.stakeAccPda,
          userTokenAccount: s.ata,
          treasuryVault: s.treasury,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc()
    );

  const claimVested = () =>
    run("Reclamar vesting", () =>
      program!.methods
        .claimVested()
        .accountsPartial({
          beneficiary: publicKey!,
          config,
          vesting: s.vestingPda,
          treasuryVault: s.treasury,
          beneficiaryTokenAccount: s.ata,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc()
    );

  const buyUrl = s
    ? `https://raydium.io/swap/?outputMint=${s.mint.toBase58()}&inputMint=sol`
    : "https://raydium.io/swap/";

  const staked = s?.stake ? fromRaw(s.stake.amount) : 0;
  const tier = s?.stake ? TIERS[s.stake.tier] ?? "—" : "—";
  const unlock = s?.stake?.unlockAt
    ? new Date(Number(s.stake.unlockAt) * 1000)
    : null;

  return (
    <div className="wrap">
      <header>
        <div className="brand">
          <img src={`${import.meta.env.BASE_URL}qvlt-logo.svg`} width={40} height={40} alt="QVAULT" />
          <div>
            <h1>QVAULT</h1>
            <span className="sub">$QVLT · Solana devnet</span>
          </div>
        </div>
        <WalletMultiButton />
      </header>

      {!publicKey && (
        <div className="card hero">
          <h2>Quantum-proof community protocol</h2>
          <p>Conecta tu wallet para hacer staking de $QVLT y ganar recompensas.</p>
          <a className="btn primary" href={buyUrl} target="_blank" rel="noreferrer">
            Comprar $QVLT en Raydium ↗
          </a>
        </div>
      )}

      {publicKey && (
        <>
          <div className="grid">
            <div className="card stat"><span>Tu balance</span><b>{s ? fmt(s.balance) : "…"} QVLT</b></div>
            <div className="card stat"><span>En staking</span><b>{fmt(staked)} QVLT</b></div>
            <div className="card stat"><span>Tier</span><b>{tier}</b></div>
            <div className="card stat"><span>Total staked (protocolo)</span><b>{s ? fmt(s.totalStaked) : "…"}</b></div>
          </div>

          <div className="card">
            <h3>Staking</h3>
            <div className="row">
              <label>Cantidad (QVLT)
                <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" />
              </label>
              <label>Bloqueo (días)
                <input value={lockup} onChange={(e) => setLockup(e.target.value)} inputMode="numeric" />
              </label>
            </div>
            <div className="actions">
              <button className="btn primary" disabled={busy || !s} onClick={stake}>Stake</button>
              <button className="btn" disabled={busy || !s} onClick={unstake}>Unstake</button>
              <button className="btn" disabled={busy || !s} onClick={claim}>Reclamar recompensas</button>
            </div>
            {unlock && <p className="muted">Desbloqueo: {unlock.toLocaleString()}</p>}
          </div>

          <div className="card">
            <h3>Comprar</h3>
            <p className="muted">Adquiere $QVLT en el pool de Raydium.</p>
            <a className="btn primary" href={buyUrl} target="_blank" rel="noreferrer">Comprar en Raydium ↗</a>
          </div>

          {s?.vesting && (
            <div className="card">
              <h3>Vesting</h3>
              <div className="grid" style={{ marginBottom: 12 }}>
                <div className="stat"><span>Total</span><b>{fmt(fromRaw(s.vesting.totalAmount))}</b></div>
                <div className="stat"><span>Liberado</span><b>{fmt(fromRaw(s.vesting.releasedAmount))}</b></div>
                <div className="stat"><span>Cliff</span><b>{new Date(Number(s.vesting.cliffTs) * 1000).toLocaleDateString()}</b></div>
                <div className="stat"><span>Fin</span><b>{new Date(Number(s.vesting.endTs) * 1000).toLocaleDateString()}</b></div>
              </div>
              <button className="btn primary" disabled={busy} onClick={claimVested}>Reclamar lo liberado</button>
            </div>
          )}
        </>
      )}

      {msg && <div className="msg">{msg}</div>}
      <footer>
        <span>Program: {PROGRAM_ID.toBase58().slice(0, 8)}…</span>
        <span>· devnet · no es consejo financiero</span>
      </footer>
    </div>
  );
}

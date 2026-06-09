import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

/* ─────────────────────────── constants ──────────────────────────── */
const PROGRAM_ID = new PublicKey((idl as any).address);
const TIERS = ["Electron", "Photon", "Qubit"];
const DEC = 1_000_000_000n;
const LAUNCH_DATE = new Date("2026-06-20T12:00:00Z"); // noon UTC = 14:00 Madrid

const toRaw = (qvlt: string) =>
  new BN((BigInt(Math.max(0, Math.floor(Number(qvlt) || 0))) * DEC).toString());
const fromRaw = (x: any) => Number(BigInt(x.toString()) / 1_000_000n) / 1000;
const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 3 });
const pad = (n: number) => String(n).padStart(2, "0");

const seed = (s: string, extra?: Buffer) =>
  PublicKey.findProgramAddressSync(
    extra ? [Buffer.from(s), extra] : [Buffer.from(s)],
    PROGRAM_ID
  )[0];

/* ─────────────────────────── countdown hook ─────────────────────── */
function getTimeLeft(target: Date) {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1_000),
    done: false,
  };
}

function useCountdown(target: Date) {
  const [t, setT] = useState(() => getTimeLeft(target));
  useEffect(() => {
    const id = setInterval(() => setT(getTimeLeft(target)), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

/* ─────────────────────────── sub-components ─────────────────────── */
function CountdownBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="cd-block">
      <div className="cd-num">{pad(value)}</div>
      <div className="cd-label">{label}</div>
    </div>
  );
}

function HeroSection({ onEnterApp }: { onEnterApp: () => void }) {
  const t = useCountdown(LAUNCH_DATE);
  return (
    <section className="hero-section">
      {/* Animated hex grid background */}
      <div className="hex-bg" aria-hidden />

      <div className="hero-inner">
        <div className="glyph-badge">⬡</div>
        <h1 className="hero-title">
          Building the Financial System<br />
          <span className="gradient-text">for the Quantum Era</span>
        </h1>
        <p className="hero-sub">
          Classical cryptography has a deadline. We're building before it expires.<br />
          <strong>$QVLT</strong> — community-owned, Solana-native, quantum-ready.
        </p>

        <div className="launch-label">
          {t.done ? "🚀 LIVE NOW" : "Genesis Launch — 20 June 2026"}
        </div>

        {!t.done && (
          <div className="countdown">
            <CountdownBlock value={t.days} label="DAYS" />
            <div className="cd-sep">:</div>
            <CountdownBlock value={t.hours} label="HRS" />
            <div className="cd-sep">:</div>
            <CountdownBlock value={t.minutes} label="MIN" />
            <div className="cd-sep">:</div>
            <CountdownBlock value={t.seconds} label="SEC" />
          </div>
        )}

        <div className="hero-ctas">
          <a
            className="btn primary large"
            href="https://twitter.com/TheQVault"
            target="_blank"
            rel="noreferrer"
          >
            Follow @TheQVault ↗
          </a>
          <button className="btn large" onClick={onEnterApp}>
            Enter App →
          </button>
        </div>
      </div>
    </section>
  );
}

function MissionSection() {
  return (
    <section className="section" id="mission">
      <div className="section-inner">
        <div className="section-tag">Why QVAULT</div>
        <h2 className="section-title">The clock is ticking on classical crypto</h2>
        <p className="section-body">
          Quantum computers are advancing faster than the estimates.
          Google, IBM, and state actors are pushing the boundary every quarter.
          The math protecting your private keys today — ECDSA, RSA, secp256k1 —
          is solvable by a sufficiently large quantum machine.
          <br /><br />
          <strong>No blockchain has seriously prepared for this.</strong> QVAULT does.
        </p>

        <div className="pillars">
          <div className="pillar">
            <div className="pillar-icon">🧬</div>
            <h3>Phase 1 — Community</h3>
            <p>A global movement of holders, stakers, and believers in quantum-safe finance.
              Fee-sharing, governance, and buyback &amp; burn — live on Solana for near-zero fees.</p>
            <span className="phase-badge current">Now → Jun 2026</span>
          </div>
          <div className="pillar">
            <div className="pillar-icon">🛡️</div>
            <h3>Phase 2 — Security Layer</h3>
            <p>Post-quantum signature tooling, cross-chain bridges, and tier-2 exchange listings.
              The treasury funds it; governance approves it.</p>
            <span className="phase-badge">2026 – 2027</span>
          </div>
          <div className="pillar">
            <div className="pillar-icon">⚛️</div>
            <h3>Phase 3 — Quantum L1</h3>
            <p>A purpose-built Layer 1 using CRYSTALS-Dilithium post-quantum signatures.
              The first blockchain designed from day 0 to survive the quantum era.</p>
            <span className="phase-badge">2027 – 2028</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function TokenomicsSection() {
  return (
    <section className="section alt" id="tokenomics">
      <div className="section-inner">
        <div className="section-tag">Tokenomics</div>
        <h2 className="section-title">Built for holders, not whales</h2>

        <div className="tok-grid">
          <div className="tok-stat">
            <span>Total Supply</span>
            <b>1,000,000,000</b>
            <small>$QVLT — fixed forever</small>
          </div>
          <div className="tok-stat">
            <span>Decimals</span>
            <b>9</b>
            <small>Solana native</small>
          </div>
          <div className="tok-stat">
            <span>Fee split</span>
            <b>40 / 20 / 25 / 15</b>
            <small>Stakers / Burn / DAO / Growth</small>
          </div>
          <div className="tok-stat">
            <span>Vesting</span>
            <b>On-chain</b>
            <small>Enforced by contract</small>
          </div>
        </div>

        <div className="tiers">
          <h3>Staking Tiers</h3>
          <div className="tier-grid">
            <div className="tier-card electron">
              <div className="tier-icon">⚡</div>
              <div className="tier-name">Electron</div>
              <div className="tier-req">10,000 QVLT</div>
              <div className="tier-perk">Earn staking rewards</div>
            </div>
            <div className="tier-card photon">
              <div className="tier-icon">🔆</div>
              <div className="tier-name">Photon</div>
              <div className="tier-req">50,000 QVLT</div>
              <div className="tier-perk">Rewards + governance votes</div>
            </div>
            <div className="tier-card qubit">
              <div className="tier-icon">🧊</div>
              <div className="tier-name">Qubit</div>
              <div className="tier-req">250,000 QVLT</div>
              <div className="tier-perk">DAO council seat</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function RoadmapSection() {
  const steps = [
    { date: "Jun 2026", label: "Genesis Launch", desc: "Token on Solana mainnet. Staking, fee-sharing, buyback & burn and DAO governance all live.", done: false, active: true },
    { date: "Q3 2026", label: "Exchange listings", desc: "CEX listings on tier-2 exchanges. Raydium pool live. Security audit published.", done: false, active: false },
    { date: "Q4 2026", label: "QVAULT Academy", desc: "Free post-quantum education platform. Grow the most informed crypto community.", done: false, active: false },
    { date: "2027", label: "Post-Quantum Bridge", desc: "Cross-chain bridge with PQC signature verification. First quantum-resistant DeFi primitive.", done: false, active: false },
    { date: "2027–28", label: "Quantum L1", desc: "CRYSTALS-Dilithium Layer 1. The blockchain that survives quantum supremacy.", done: false, active: false },
  ];

  return (
    <section className="section" id="roadmap">
      <div className="section-inner">
        <div className="section-tag">Roadmap</div>
        <h2 className="section-title">Five phases. One mission.</h2>
        <div className="roadmap">
          {steps.map((s, i) => (
            <div key={i} className={`rm-step ${s.active ? "active" : ""} ${s.done ? "done" : ""}`}>
              <div className="rm-dot" />
              <div className="rm-content">
                <div className="rm-date">{s.date}</div>
                <div className="rm-label">{s.label}</div>
                <div className="rm-desc">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function JoinSection() {
  return (
    <section className="section alt join-section" id="join">
      <div className="section-inner center">
        <div className="glyph-badge large">⬡</div>
        <h2 className="section-title">Be early. Be quantum-safe.</h2>
        <p className="section-body">
          The window to build quantum-safe infrastructure is open right now.<br />
          In five years it may not be. Join the movement today.
        </p>
        <div className="hero-ctas">
          <a className="btn primary large" href="https://twitter.com/TheQVault" target="_blank" rel="noreferrer">
            Follow @TheQVault ↗
          </a>
          <a className="btn large" href="https://t.me/TheQVault" target="_blank" rel="noreferrer">
            Telegram ↗
          </a>
        </div>
        <p className="disclaimer">
          $QVLT is not an investment. Not financial advice. Smart contract unaudited — use at your own risk.
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────── dApp ───────────────────────────────── */
function DApp() {
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
    const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
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
      try { balance = fromRaw((await getAccount(connection, ata)).amount); } catch {}
      let stake: any = null;
      try { stake = await (program.account as any).stakeAccount.fetch(stakeAccPda); } catch {}
      let vesting: any = null;
      try { vesting = await (program.account as any).vestingSchedule.fetch(seed("vesting", publicKey.toBuffer())); } catch {}
      setS({ mint, ata, stakeAccPda, stakingVault, treasury, balance, stake, vestingPda: seed("vesting", publicKey.toBuffer()), vesting, totalStaked: fromRaw(cfg.totalStaked), totalBurned: fromRaw(cfg.totalBurned), paused: cfg.paused });
      setMsg("");
    } catch (e: any) {
      setMsg("⚠️ Contract not initialized on this network: " + (e.message || e));
    }
  }, [program, publicKey, connection, config]);

  useEffect(() => { refresh(); }, [refresh]);

  const run = async (label: string, fn: () => Promise<string>) => {
    if (!program || !publicKey || !s) return;
    setBusy(true); setMsg(label + "…");
    try {
      const sig = await fn();
      setMsg(`✅ ${label} — ${sig.slice(0, 12)}…`);
      await refresh();
    } catch (e: any) {
      setMsg(`❌ ${label}: ` + (e.message || e));
    } finally { setBusy(false); }
  };

  const stake = () => run("Stake", () => program!.methods.stake(toRaw(amount), Number(lockup)).accountsPartial({ user: publicKey!, config, stakeAccount: s.stakeAccPda, userTokenAccount: s.ata, stakingVault: s.stakingVault, tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId }).rpc());
  const unstake = () => run("Unstake", () => program!.methods.unstake(toRaw(amount)).accountsPartial({ user: publicKey!, config, stakeAccount: s.stakeAccPda, userTokenAccount: s.ata, stakingVault: s.stakingVault, treasuryVault: s.treasury, tokenProgram: TOKEN_PROGRAM_ID }).rpc());
  const claim = () => run("Claim rewards", () => program!.methods.claimRewards().accountsPartial({ user: publicKey!, config, stakeAccount: s.stakeAccPda, userTokenAccount: s.ata, treasuryVault: s.treasury, tokenProgram: TOKEN_PROGRAM_ID }).rpc());
  const claimVested = () => run("Claim vested", () => program!.methods.claimVested().accountsPartial({ beneficiary: publicKey!, config, vesting: s.vestingPda, treasuryVault: s.treasury, beneficiaryTokenAccount: s.ata, tokenProgram: TOKEN_PROGRAM_ID }).rpc());

  const buyUrl = s ? `https://raydium.io/swap/?outputMint=${s.mint.toBase58()}&inputMint=sol` : "https://raydium.io/swap/";
  const staked = s?.stake ? fromRaw(s.stake.amount) : 0;
  const tier = s?.stake ? TIERS[s.stake.tier] ?? "—" : "—";
  const unlock = s?.stake?.unlockAt ? new Date(Number(s.stake.unlockAt) * 1000) : null;

  return (
    <div className="dapp-wrap">
      <div className="dapp-header">
        <div className="brand">
          <img src={`${import.meta.env.BASE_URL}qvlt-logo.svg`} width={36} height={36} alt="QVAULT" />
          <div>
            <h1>QVAULT</h1>
            <span className="sub">$QVLT · Solana</span>
          </div>
        </div>
        <WalletMultiButton />
      </div>

      {!publicKey && (
        <div className="card hero-card">
          <h2>Quantum-proof community protocol</h2>
          <p>Connect your wallet to stake $QVLT and earn protocol rewards.</p>
          <a className="btn primary" href={buyUrl} target="_blank" rel="noreferrer">Buy $QVLT on Raydium ↗</a>
        </div>
      )}

      {publicKey && (
        <>
          <div className="grid">
            <div className="card stat"><span>Your balance</span><b>{s ? fmt(s.balance) : "…"} QVLT</b></div>
            <div className="card stat"><span>Staked</span><b>{fmt(staked)} QVLT</b></div>
            <div className="card stat"><span>Tier</span><b>{tier}</b></div>
            <div className="card stat"><span>Protocol staked</span><b>{s ? fmt(s.totalStaked) : "…"}</b></div>
          </div>
          <div className="card">
            <h3>Staking</h3>
            <div className="row">
              <label>Amount (QVLT)<input value={amount} onChange={e => setAmount(e.target.value)} inputMode="numeric" /></label>
              <label>Lock period (days)<input value={lockup} onChange={e => setLockup(e.target.value)} inputMode="numeric" /></label>
            </div>
            <div className="actions">
              <button className="btn primary" disabled={busy || !s} onClick={stake}>Stake</button>
              <button className="btn" disabled={busy || !s} onClick={unstake}>Unstake</button>
              <button className="btn" disabled={busy || !s} onClick={claim}>Claim rewards</button>
            </div>
            {unlock && <p className="muted">Unlocks: {unlock.toLocaleString()}</p>}
          </div>
          <div className="card">
            <h3>Buy $QVLT</h3>
            <p className="muted">Trade on Raydium AMM pool.</p>
            <a className="btn primary" href={buyUrl} target="_blank" rel="noreferrer">Buy on Raydium ↗</a>
          </div>
          {s?.vesting && (
            <div className="card">
              <h3>Vesting</h3>
              <div className="grid" style={{ marginBottom: 12 }}>
                <div className="stat"><span>Total</span><b>{fmt(fromRaw(s.vesting.totalAmount))}</b></div>
                <div className="stat"><span>Released</span><b>{fmt(fromRaw(s.vesting.releasedAmount))}</b></div>
                <div className="stat"><span>Cliff</span><b>{new Date(Number(s.vesting.cliffTs) * 1000).toLocaleDateString()}</b></div>
                <div className="stat"><span>End</span><b>{new Date(Number(s.vesting.endTs) * 1000).toLocaleDateString()}</b></div>
              </div>
              <button className="btn primary" disabled={busy} onClick={claimVested}>Claim vested tokens</button>
            </div>
          )}
        </>
      )}
      {msg && <div className="msg">{msg}</div>}
      <footer>
        <span>Program: {PROGRAM_ID.toBase58().slice(0, 8)}…</span>
        <span>· Solana · Not financial advice</span>
      </footer>
    </div>
  );
}

/* ─────────────────────────── root ───────────────────────────────── */
export default function App() {
  const [showApp, setShowApp] = useState(false);
  const appRef = useRef<HTMLDivElement>(null);

  const handleEnterApp = () => {
    setShowApp(true);
    setTimeout(() => appRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  return (
    <div className="root">
      {/* ── Navigation ── */}
      <nav className="topnav">
        <div className="nav-brand">⬡ <strong>QVAULT</strong></div>
        <div className="nav-links">
          <a href="#mission">Mission</a>
          <a href="#tokenomics">Token</a>
          <a href="#roadmap">Roadmap</a>
          <a href="https://twitter.com/TheQVault" target="_blank" rel="noreferrer">X ↗</a>
          <button className="btn primary nav-btn" onClick={handleEnterApp}>Launch App →</button>
        </div>
      </nav>

      {/* ── Landing sections ── */}
      <HeroSection onEnterApp={handleEnterApp} />
      <MissionSection />
      <TokenomicsSection />
      <RoadmapSection />
      <JoinSection />

      {/* ── dApp ── */}
      <div ref={appRef} id="app" className="dapp-section">
        <DApp />
      </div>
    </div>
  );
}

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import * as Linking from "expo-linking";
import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import {
  connect as phantomConnect,
  disconnect as phantomDisconnect,
  handleConnectResponse,
  handleSignResponse,
  signAndSendTransaction,
} from "../services/phantom";
import { loadSession, PhantomSession } from "../services/storage";
import { getBalances, Balances } from "../services/solana";
import { getPrices as fetchPrices, PriceData } from "../services/price";

type SignResolver = (sig: string) => void;
type SignRejecter = (err: Error) => void;

type WalletState = {
  session: PhantomSession | null;
  publicKey: PublicKey | null;
  balances: Balances;
  prices: PriceData;
  loading: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Sign+send via Phantom; resolves with the signature once Phantom returns. */
  sendTransaction: (tx: Transaction | VersionedTransaction) => Promise<string>;
};

const Ctx = createContext<WalletState | null>(null);

export function useWallet(): WalletState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWallet must be used inside <WalletProvider>");
  return v;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<PhantomSession | null>(null);
  const [balances, setBalances] = useState<Balances>({ sol: 0, qvlt: 0 });
  const [prices, setPrices] = useState<PriceData>({ qvltUsd: null, solUsd: null });
  const [loading, setLoading] = useState(false);

  // Pending sign request waiting on the onSign deep link.
  const pendingSign = useRef<{ resolve: SignResolver; reject: SignRejecter } | null>(
    null
  );

  const publicKey = session ? new PublicKey(session.publicKey) : null;

  const refresh = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const owner = new PublicKey(session.publicKey);
      const [b, p] = await Promise.all([getBalances(owner), fetchPrices()]);
      setBalances(b);
      setPrices(p);
    } finally {
      setLoading(false);
    }
  }, [session]);

  // Restore a saved session on launch.
  useEffect(() => {
    loadSession().then((s) => {
      if (s) setSession(s);
    });
  }, []);

  useEffect(() => {
    if (session) refresh();
  }, [session, refresh]);

  // ── Deep-link router ──────────────────────────────────────────────────────
  useEffect(() => {
    const handle = async (url: string) => {
      const { path, queryParams } = Linking.parse(url);
      const q = (queryParams ?? {}) as Record<string, string>;
      try {
        if (path === "onConnect") {
          const s = await handleConnectResponse(q);
          setSession(s);
        } else if (path === "onSign") {
          const current = await loadSession();
          if (!current) return;
          const sig = handleSignResponse(q, current.sharedSecret);
          pendingSign.current?.resolve(sig);
          pendingSign.current = null;
          refresh();
        }
      } catch (e: any) {
        pendingSign.current?.reject(e);
        pendingSign.current = null;
      }
    };

    const sub = Linking.addEventListener("url", ({ url }) => handle(url));
    Linking.getInitialURL().then((url) => {
      if (url) handle(url);
    });
    return () => sub.remove();
  }, [refresh]);

  const connect = useCallback(async () => {
    await phantomConnect();
  }, []);

  const disconnect = useCallback(async () => {
    await phantomDisconnect();
    setSession(null);
    setBalances({ sol: 0, qvlt: 0 });
  }, []);

  const sendTransaction = useCallback(
    (tx: Transaction | VersionedTransaction) =>
      new Promise<string>((resolve, reject) => {
        pendingSign.current = { resolve, reject };
        signAndSendTransaction(tx).catch((e) => {
          pendingSign.current = null;
          reject(e);
        });
      }),
    []
  );

  return (
    <Ctx.Provider
      value={{
        session,
        publicKey,
        balances,
        prices,
        loading,
        connect,
        disconnect,
        refresh,
        sendTransaction,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

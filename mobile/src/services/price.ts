/**
 * Price feed. Pre-launch there is no market, so QVLT price is null and we show
 * "Not trading yet". Post-launch, once a Raydium pool exists, Jupiter's public
 * price API returns a live price by mint with no API key.
 */
import { QVLT_MINT, CLUSTER } from "../constants";

const SOL_MINT = "So11111111111111111111111111111111111111112";

export type PriceData = {
  qvltUsd: number | null;
  solUsd: number | null;
};

export async function getPrices(): Promise<PriceData> {
  // Devnet has no real market — don't pretend.
  if (CLUSTER === "devnet") {
    return { qvltUsd: null, solUsd: await fetchSolUsd() };
  }
  try {
    const res = await fetch(
      `https://price.jup.ag/v6/price?ids=${QVLT_MINT.toBase58()},${SOL_MINT}`
    );
    const json = await res.json();
    return {
      qvltUsd: json?.data?.[QVLT_MINT.toBase58()]?.price ?? null,
      solUsd: json?.data?.[SOL_MINT]?.price ?? null,
    };
  } catch {
    return { qvltUsd: null, solUsd: null };
  }
}

async function fetchSolUsd(): Promise<number | null> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
    );
    const json = await res.json();
    return json?.solana?.usd ?? null;
  } catch {
    return null;
  }
}

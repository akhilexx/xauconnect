/**
 * Live USD prices for wallet valuation and swap analytics.
 * CoinGecko batch (cached) → DexScreener spot → demo fallback.
 */
import { DEFAULT_TOKENS, type TokenInfo } from "@xauconnect/utils";
import { cached } from "../cache.js";
import { demoUsdPrice } from "../demo/data.js";
import { dexTokenLookup } from "./dexscreener.js";

const PRICE_CACHE_SEC = 120;

const COINGECKO_IDS = [
  ...new Set(
    DEFAULT_TOKENS.map((t) => t.coingeckoId).filter((id): id is string => Boolean(id)),
  ),
];

async function fetchCoingeckoPriceMap(): Promise<Record<string, number>> {
  if (COINGECKO_IDS.length === 0) return {};
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${COINGECKO_IDS.join(",")}&vs_currencies=usd&include_last_updated_at=true`,
      { signal: AbortSignal.timeout(4_000) },
    );
    if (!res.ok) return {};
    const data = (await res.json()) as Record<string, { usd?: number; last_updated_at?: number }>;
    const out: Record<string, number> = {};
    for (const [id, row] of Object.entries(data)) {
      const usd = row?.usd;
      if (usd != null && Number.isFinite(usd) && usd > 0 && Math.abs(Date.now()/1000-(row.last_updated_at??0))<1800) out[id] = usd;
    }
    return out;
  } catch {
    return {};
  }
}

async function coingeckoPriceMap(): Promise<Record<string, number>> {
  return cached("prices:coingecko:v1", PRICE_CACHE_SEC, fetchCoingeckoPriceMap);
}

/** USD price for a catalog token (stablecoins pegged at $1). */
export async function tokenUsdPrice(token: Pick<TokenInfo, "symbol" | "address" | "chainKey" | "coingeckoId">): Promise<number> {
  if (token.symbol === "USDC" || token.symbol === "USDT" || token.symbol === "DAI") return 1;

  const cg = await coingeckoPriceMap();
  if (token.coingeckoId && cg[token.coingeckoId] != null && cg[token.coingeckoId]! > 0) {
    return cg[token.coingeckoId]!;
  }

  const spot = await dexTokenLookup(token.address, token.chainKey).catch(() => null);
  if (spot?.priceUsd != null && spot.priceUsd > 0) return spot.priceUsd;

  return demoUsdPrice(token.coingeckoId, token.address);
}

/** Contemporaneous prices for accounting: curated contract/mint identity, no demo or peg fallback. */
export async function settlementPrices(chainKey: string, addresses: string[]) {
  const prices = {...await coingeckoPriceMap().catch(()=>({}) as Record<string,number>)};
  const missing = DEFAULT_TOKENS.filter(t=>t.chainKey===chainKey && t.coingeckoId && !prices[t.coingeckoId] &&
    addresses.some(a=>chainKey==="solana"?a===t.address:a.toLowerCase()===t.address.toLowerCase())).map(t=>"coingecko:"+t.coingeckoId);
  if(missing.length){
    const ids=missing.sort().join(",");
    const fallback=await cached("ledger:prices:"+ids,90,async()=>{
      const r=await fetch("https://coins.llama.fi/prices/current/"+encodeURIComponent(ids),{signal:AbortSignal.timeout(3500)});
      if(!r.ok)return {};
      const data=await r.json() as {coins:Record<string,{price:number;confidence:number;timestamp:number}>};
      return Object.fromEntries(Object.entries(data.coins).filter(([k,p])=>missing.includes(k) && p.confidence>=0.95 &&
        Math.abs(Date.now()/1000-p.timestamp)<1800 && Number.isFinite(p.price) && p.price>0).map(([k,p])=>[k.slice("coingecko:".length),p.price]));
    }).catch(()=>({}));
    Object.assign(prices,fallback);
  }
  const result: Record<string, { usd: number; decimals: number }> = {};
  for (const address of addresses) {
    const token = DEFAULT_TOKENS.find(t => t.chainKey === chainKey &&
      (chainKey === "solana" ? t.address === address : t.address.toLowerCase() === address.toLowerCase()));
    const usd = token?.coingeckoId ? prices[token.coingeckoId] : undefined;
    if (token && usd && Number.isFinite(usd) && usd > 0) result[address] = { usd, decimals: token.decimals };
  }
  return result;
}

/**
 * One-off diagnostic — tests 0x Cross-Chain + 1inch Fusion+ from server env.
 * Usage: node scripts/test-cross-chain-apis.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = process.env.ENV_FILE ?? resolve(process.cwd(), ".env");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

const ZEROX = env.ZEROX_API_KEY;
const INCH = env.ONEINCH_API_KEY;
const INCH_BASE = (env.ONEINCH_API_BASE ?? "https://api.1inch.com").replace(/\/$/, "");
console.log("ZEROX_API_KEY:", ZEROX ? `set (${ZEROX.length} chars)` : "MISSING");
console.log("ONEINCH_API_KEY:", INCH ? `set (${INCH.length} chars)` : "MISSING");
console.log("ONEINCH_API_BASE:", INCH_BASE);

const PAIRS = [
  { from: "ethereum", to: "arbitrum", oc: "1", dc: "42161" },
  { from: "ethereum", to: "solana", oc: "1", dc: "solana" },
  { from: "base", to: "ethereum", oc: "8453", dc: "1" },
  { from: "solana", to: "ethereum", oc: "solana", dc: "1" },
  { from: "bsc", to: "polygon", oc: "56", dc: "137" },
  { from: "avalanche", to: "base", oc: "43114", dc: "8453" },
];

const USDC = {
  "1": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  "42161": "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
  "8453": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "56": "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
  "137": "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  "43114": "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
  solana: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
};

const TAKER_EVM = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";
const TAKER_SOL = "11111111111111111111111111111112";

async function test0x(p) {
  if (!ZEROX) return { ok: false, err: "no key" };
  const sell = USDC[p.oc];
  const buy = USDC[p.dc];
  if (!sell || !buy) return { ok: false, err: "no usdc mapping" };
  const params = new URLSearchParams({
    originChain: p.oc,
    destinationChain: p.dc,
    sellToken: sell,
    buyToken: buy,
    sellAmount: "10000000",
    originAddress: p.oc === "solana" ? TAKER_SOL : TAKER_EVM,
    sortQuotesBy: "price",
    maxQuotes: "1",
  });
  if (p.dc === "solana") params.set("destinationAddress", TAKER_SOL);
  const url = `https://api.0x.org/cross-chain/quotes?${params}`;
  const res = await fetch(url, { headers: { "0x-api-key": ZEROX, accept: "application/json" } });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body: body.slice(0, 500) };
}

async function test1inch(p) {
  if (!INCH) return { ok: false, err: "no key" };
  const srcChain = p.oc === "solana" ? "501" : p.oc;
  const dstChain = p.dc === "solana" ? "501" : p.dc;
  const sell = USDC[p.oc];
  const buy = USDC[p.dc];
  if (!sell || !buy) return { ok: false, err: "no usdc mapping" };
  const params = new URLSearchParams({
    srcChain,
    dstChain,
    srcTokenAddress: sell,
    dstTokenAddress: buy,
    amount: "10000000",
    walletAddress: p.oc === "solana" ? TAKER_SOL : TAKER_EVM,
    enableEstimate: "true",
  });
  const url = `${INCH_BASE}/fusion-plus/quoter/v1.0/quote?${params}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${INCH}`, accept: "application/json" } });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body: body.slice(0, 500) };
}

console.log("\n=== 0x same-chain (baseline) ===");
if (ZEROX) {
  const u =
    "https://api.0x.org/swap/allowance-holder/price?chainId=1&sellToken=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee&buyToken=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&sellAmount=1000000000000000000";
  const res = await fetch(u, { headers: { "0x-api-key": ZEROX, "0x-version": "v2", accept: "application/json" } });
  console.log("0x same-chain:", res.status, (await res.text()).slice(0, 200));
}

console.log("\n=== 1inch same-chain (baseline) ===");
if (INCH) {
  const u =
    `${INCH_BASE}/swap/v6.0/1/quote?src=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee&dst=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&amount=1000000000000000000`;
  const res = await fetch(u, { headers: { Authorization: `Bearer ${INCH}`, accept: "application/json" } });
  console.log("1inch same-chain:", res.status, (await res.text()).slice(0, 200));
}

async function test1inchDev(p) {
  if (!INCH) return { ok: false, err: "no key" };
  const srcChain = p.oc === "solana" ? "501" : p.oc;
  const dstChain = p.dc === "solana" ? "501" : p.dc;
  const sell = USDC[p.oc];
  const buy = USDC[p.dc];
  const params = new URLSearchParams({
    srcChain,
    dstChain,
    srcTokenAddress: sell,
    dstTokenAddress: buy,
    amount: "10000000",
    walletAddress: p.oc === "solana" ? TAKER_SOL : TAKER_EVM,
    enableEstimate: "true",
  });
  const url = `${INCH_BASE}/fusion-plus/quoter/v1.0/quote?${params}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${INCH}`, accept: "application/json" } });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body: body.slice(0, 500) };
}

console.log(`\n=== 1inch Fusion+ (${INCH_BASE}) ===`);
for (const p of PAIRS.slice(0, 3)) {
  const r = await test1inchDev(p);
  console.log(`${p.from} -> ${p.to}:`, r.ok ? "OK" : `FAIL ${r.status ?? r.err}`, r.body?.slice(0, 120) ?? "");
  await new Promise((x) => setTimeout(x, 500));
}

console.log("\n=== 0x Cross-Chain ===");
for (const p of PAIRS) {
  const r = await test0x(p);
  console.log(`${p.from} -> ${p.to}:`, r.ok ? "OK" : `FAIL ${r.status ?? r.err}`, r.body?.slice(0, 120) ?? "");
  await new Promise((x) => setTimeout(x, 500));
}

console.log("\n=== 1inch Fusion+ ===");
for (const p of PAIRS) {
  const r = await test1inch(p);
  console.log(`${p.from} -> ${p.to}:`, r.ok ? "OK" : `FAIL ${r.status ?? r.err}`, r.body?.slice(0, 120) ?? "");
  await new Promise((x) => setTimeout(x, 500));
}

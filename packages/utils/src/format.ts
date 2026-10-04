/**
 * XAUConnect — Display & numeric formatting helpers shared by web + mobile.
 */

/** Parse a human amount ("1.5") into base units at `decimals` precision. */
export function parseUnits(value: string, decimals: number): bigint {
  const cleaned = value.trim();
  if (!/^\d*\.?\d*$/.test(cleaned) || cleaned === "" || cleaned === ".") {
    throw new Error(`Invalid numeric amount: "${value}"`);
  }
  const [whole = "0", fraction = ""] = cleaned.split(".");
  const frac = fraction.slice(0, decimals).padEnd(decimals, "0");
  return BigInt(whole + frac);
}

/** Format base units into a human string, trimming trailing zeros. */
export function formatUnits(value: bigint, decimals: number, maxFraction = 6): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const s = abs.toString().padStart(decimals + 1, "0");
  const whole = s.slice(0, s.length - decimals) || "0";
  let frac = s.slice(s.length - decimals).slice(0, maxFraction).replace(/0+$/, "");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return frac ? `${negative ? "-" : ""}${grouped}.${frac}` : `${negative ? "-" : ""}${grouped}`;
}

/** Compact USD formatting: $1.23, $45.6K, $7.89M, $1.2B. */
export function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return "$0.00";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  if (abs >= 0.01) return `${sign}$${abs.toFixed(2)}`;
  if (abs === 0) return "$0.00";
  return `${sign}$${formatMicroUsd(abs)}`;
}

/** Sub-cent meme-coin prices — decimal form, never scientific notation. */
function formatMicroUsd(abs: number): string {
  const digits = abs >= 0.0001 ? 6 : abs >= 0.000001 ? 8 : abs >= 0.00000001 ? 10 : 12;
  return abs.toFixed(digits).replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "");
}

/** Percent with sign: +4.20% / -1.30%. */
export function formatPercent(value: number, fractionDigits = 2): string {
  if (!Number.isFinite(value)) return "0.00%";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(fractionDigits)}%`;
}

/** bps -> "0.30%" */
export function formatBps(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

/** Shorten an address/mint: 0x1234…abcd */
export function shortenAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}

/** Relative time: "3m ago", "2h ago", "5d ago". */
export function timeAgo(date: Date | number | string): string {
  const ts = typeof date === "object" ? date.getTime() : new Date(date).getTime();
  const seconds = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

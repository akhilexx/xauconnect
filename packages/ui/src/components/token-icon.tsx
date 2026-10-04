"use client";

/**
 * TokenIcon — circular token logo with graceful fallback.
 *
 * Resolution order:
 *  1. explicit `src` (CoinGecko / Birdeye / DexScreener URL from the API)
 *  2. generated gold-gradient monogram SVG (first 2 chars of the symbol)
 */
import { useState } from "react";
import { cn } from "../lib/cn.js";

export interface TokenIconProps {
  symbol: string;
  src?: string;
  size?: number;
  className?: string;
}

export function TokenIcon({ symbol, src, size = 32, className }: TokenIconProps) {
  const [errored, setErrored] = useState(false);
  const showImage = src && !errored;
  const monogram = symbol.slice(0, 2).toUpperCase();

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-white/70 shadow-sm",
        className,
      )}
      style={{ width: size, height: size }}
      aria-label={symbol}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote CDN logos, next/image not available in shared pkg
        <img
          src={src}
          alt={symbol}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          onError={() => setErrored(true)}
          loading="lazy"
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center bg-gold-gradient font-bold text-ink"
          style={{ fontSize: Math.max(9, size * 0.34) }}
        >
          {monogram}
        </span>
      )}
    </span>
  );
}

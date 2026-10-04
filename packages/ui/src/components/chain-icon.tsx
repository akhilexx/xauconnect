"use client";

/**
 * ChainIcon — real network logo with graceful fallback to a colored dot.
 * Pass the chain's logo URL (from @xauconnect/utils getChainLogoUrl) and the
 * brand color for the fallback.
 */
import { useState } from "react";
import { cn } from "../lib/cn.js";

export interface ChainIconProps {
  name: string;
  src?: string;
  /** Brand color used by the fallback dot. */
  color?: string;
  size?: number;
  className?: string;
  /** Compact overlay on token icons — no extra white padding. */
  badge?: boolean;
}

export function ChainIcon({
  name,
  src,
  color = "#FFD700",
  size = 18,
  className,
  badge = false,
}: ChainIconProps) {
  const [errored, setErrored] = useState(false);
  const showImage = src && !errored;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        badge
          ? "bg-white shadow-[0_0_0_1px_rgba(255,255,255,0.95)]"
          : "bg-white/70 ring-1 ring-white/70",
        className,
      )}
      style={{ width: size, height: size }}
      aria-label={name}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote CDN logos in a shared pkg
        <img
          src={src}
          alt={name}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          onError={() => setErrored(true)}
          loading="lazy"
        />
      ) : (
        <span
          className="inline-block rounded-full"
          style={{ width: size * 0.55, height: size * 0.55, backgroundColor: color }}
        />
      )}
    </span>
  );
}

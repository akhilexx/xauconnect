"use client";

import { useEffect } from "react";
import type { SeoPageConfig } from "@xauconnect/seo";
import { SwapPanel } from "@/components/swap/swap-panel";
import { useChainStore } from "@/lib/store";
import { seoSwapHref } from "@/lib/seo/swap-href";

export interface SeoSwapWidgetProps {
  page?: SeoPageConfig;
  chainKey?: string;
  tokenOut?: string;
  tokenIn?: string;
  fromChainKey?: string;
  toChainKey?: string;
}

export function SeoSwapWidget({
  page,
  chainKey,
  tokenOut,
  tokenIn,
  fromChainKey,
  toChainKey,
}: SeoSwapWidgetProps) {
  const { setChain } = useChainStore();

  const preset = page?.swapPreset;
  const resolvedFrom = fromChainKey ?? preset?.fromChainKey;
  const resolvedTo = toChainKey ?? preset?.toChainKey;
  const resolvedIn = tokenIn ?? preset?.tokenIn;
  const resolvedOut = tokenOut ?? preset?.tokenOut;
  const isCross =
    Boolean(resolvedFrom && resolvedTo && resolvedFrom !== resolvedTo) ||
    page?.kind === "cross-chain-swap" ||
    page?.kind === "cross-chain-search";

  useEffect(() => {
    if (resolvedFrom && !isCross) setChain(resolvedFrom);
    else if (chainKey) setChain(chainKey);
  }, [resolvedFrom, chainKey, isCross, setChain]);

  const href = page ? seoSwapHref(page) : "/swap";

  return (
    <div className="space-y-3">
      <SwapPanel
        compact
        presetChainKey={isCross ? resolvedFrom : chainKey ?? resolvedFrom}
        presetFromChainKey={isCross ? resolvedFrom : undefined}
        presetToChainKey={isCross ? resolvedTo : undefined}
        presetTokenIn={resolvedIn}
        presetTokenOut={resolvedOut}
        presetSwapMode={isCross ? "cross" : undefined}
      />
      <p className="text-center text-sm text-ink-muted">
        <a href={href} className="font-semibold text-gold-deep underline hover:text-ink">
          Open full swap experience
        </a>
      </p>
    </div>
  );
}

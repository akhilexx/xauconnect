import Link from "next/link";
import { BRAND_NAME } from "@xauconnect/utils";
import { GlassButton } from "@xauconnect/ui";
import { ArrowRight, Rocket } from "lucide-react";

/** Server-rendered hero copy — visible to crawlers without JavaScript. */
export function HomeHeroCopy() {
  return (
    <div className="flex min-w-0 max-w-2xl flex-col items-stretch gap-5 sm:items-start sm:gap-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-gold-deep">
        The XAU Liquidity Engine · live on 7 chains
      </p>
      <h1 className="font-display text-[1.85rem] font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
        The <span className="gold-text">Gold Standard</span>
        <br />
        of Liquidity.
      </h1>
      <p className="max-w-lg text-sm leading-relaxed text-ink-muted sm:text-lg">
        {BRAND_NAME} is a non-custodial multi-chain DEX aggregator and token launchpad. Compare
        live routes across Ethereum, Solana, BNB Chain, Polygon, Arbitrum, Base, and Avalanche —
        transparent fees, wallet-signed swaps, and bonding-curve launches with locked liquidity.
      </p>
      <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <Link href="/swap" className="w-full sm:w-auto">
          <GlassButton size="lg" className="w-full sm:w-auto">
            Start Swapping <ArrowRight className="h-4 w-4" />
          </GlassButton>
        </Link>
        <Link href="/launchpad" className="w-full sm:w-auto">
          <GlassButton size="lg" variant="glass" className="w-full sm:w-auto">
            <Rocket className="h-4 w-4" /> Launch a Token
          </GlassButton>
        </Link>
      </div>
      <p className="max-w-full text-xs leading-relaxed text-ink-faint">
        Transaction simulation before every swap · non-custodial by design · public Swap API for
        developers and AI agents
      </p>
    </div>
  );
}

"use client";

/**
 * NetworkGrid — the chains XAUConnect lives on, presented as first-party
 * deployments of the XAU liquidity engine. No third-party venue names appear
 * anywhere: XAUConnect is its own brand.
 */
import { motion } from "framer-motion";
import { ArrowLeftRight, Droplets, Rocket } from "lucide-react";
import { CHAINS, getChainLogoUrl, getDexesForChain } from "@xauconnect/utils";
import { ChainIcon, GlassPanel, Badge } from "@xauconnect/ui";

const CAPABILITIES = [
  { icon: ArrowLeftRight, label: "Instant swaps" },
  { icon: Droplets, label: "Deep pools" },
  { icon: Rocket, label: "Token launches" },
];

export function NetworkGrid() {
  return (
    <GlassPanel className="relative overflow-hidden p-4 sm:p-8">
      {/* decorative gradient wash */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gold/20 blur-3xl sm:-right-24 sm:-top-24 sm:h-72 sm:w-72"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-blush/15 blur-3xl sm:-bottom-28 sm:-left-20 sm:h-72 sm:w-72"
        aria-hidden
      />

      <h2 className="font-display text-xl font-bold">
        One engine. <span className="gold-pink-text">Every chain.</span>
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-ink-muted">
        The XAU Liquidity Engine runs natively on seven networks — swap, provide liquidity, and
        launch tokens with the same gold-standard experience everywhere.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CHAINS.map((chain, i) => {
          const routeCount = getDexesForChain(chain.key).length;
          return (
            <motion.div
              key={chain.key}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.45 }}
              className="group rounded-2xl bg-white/45 p-4 ring-1 ring-white/70 transition-shadow hover:shadow-gold-glow"
            >
              <div className="flex items-center gap-2.5">
                <ChainIcon
                  name={chain.name}
                  src={getChainLogoUrl(chain.key)}
                  color={chain.color}
                  size={32}
                  className="shadow-sm"
                />
                <div>
                  <p className="text-sm font-bold leading-tight">{chain.name}</p>
                  <p className="text-[11px] text-ink-faint">
                    {routeCount} XAU route{routeCount === 1 ? "" : "s"} live
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone="gold">Swaps</Badge>
                <Badge tone="pink">Pools</Badge>
                <Badge tone="neutral">Launchpad</Badge>
              </div>
            </motion.div>
          );
        })}

        {/* capability tile fills the 8th slot */}
        <div className="flex flex-col justify-center gap-2.5 rounded-2xl bg-gold-gradient/90 bg-gold-gradient p-4 shadow-gold-glow">
          {CAPABILITIES.map(({ icon: Icon, label }) => (
            <span key={label} className="flex items-center gap-2 text-sm font-bold text-ink">
              <Icon className="h-4 w-4" /> {label}
            </span>
          ))}
        </div>
      </div>
    </GlassPanel>
  );
}

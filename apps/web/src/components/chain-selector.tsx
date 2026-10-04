"use client";

/**
 * ChainSelector — horizontal chain pills bound to the global chain store.
 */
import { motion } from "framer-motion";
import { CHAINS, getChainLogoUrl } from "@xauconnect/utils";
import { ChainIcon, cn } from "@xauconnect/ui";
import { useChainStore } from "@/lib/store";

export function ChainSelector({
  className,
  layout = "scroll",
  onChange,
}: {
  className?: string;
  /** `scroll` = horizontal tabs; `wrap` = all chains visible in a wrapped grid. */
  layout?: "scroll" | "wrap";
  /** Fired after the global chain store updates (e.g. clear swap URL presets). */
  onChange?: (chainKey: string) => void;
}) {
  const { chainKey, setChain } = useChainStore();

  return (
    <div
      className={cn(
        layout === "wrap"
          ? "flex flex-wrap items-center justify-center gap-1.5"
          : "scroll-x-tabs -mx-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1 pb-0.5",
        className,
      )}
      role="tablist"
      aria-label="Select network"
    >
      {CHAINS.map((chain) => {
        const active = chain.key === chainKey;
        return (
          <button
            key={chain.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => {
              setChain(chain.key);
              onChange?.(chain.key);
            }}
            className={cn(
              "relative flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-2 text-xs font-semibold transition-colors min-h-9 sm:min-h-0 sm:px-3 sm:py-1.5",
              layout === "wrap" && "px-2 py-1.5",
              active ? "text-ink" : "text-ink-muted hover:text-ink",
            )}
            aria-pressed={active}
          >
            {active && (
              <motion.span
                layoutId="chain-pill"
                className="absolute inset-0 rounded-full glass shadow-glass"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <ChainIcon
              name={chain.name}
              src={getChainLogoUrl(chain.key)}
              color={chain.color}
              size={16}
              className="relative z-10 shrink-0"
            />
            <span className="relative z-10 whitespace-nowrap">
              {layout === "wrap" ? chain.name : (
                <>
                  <span className="sm:hidden">{chain.nativeSymbol}</span>
                  <span className="hidden sm:inline">{chain.name}</span>
                </>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

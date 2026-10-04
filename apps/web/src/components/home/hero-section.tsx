"use client";

/**
 * Live swap terminal for the homepage hero column.
 * Headline copy is server-rendered in HomeHeroCopy for crawlers.
 */
import { motion } from "framer-motion";
import { SwapPanel } from "../swap/swap-panel";

export function HeroSwapPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="min-w-0 w-full"
    >
      <SwapPanel compact />
    </motion.div>
  );
}

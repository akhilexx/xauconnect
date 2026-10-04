"use client";

/**
 * GlassCard / GlassPanel — core Liquid Glass surfaces.
 *
 * Variants
 *   default   semi-transparent white, blur-24, soft shadow
 *   strong    more opaque, blur-32 — for content-dense panels
 *   gradient  gold→pink gradient border with glass interior
 *
 * `hover` adds lift + sheen sweep micro-interaction.
 */
import { forwardRef, type HTMLAttributes } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn.js";

const glassVariants = cva("rounded-glass", {
  variants: {
    variant: {
      default: "glass",
      strong: "glass-strong",
      gradient: "gradient-border-soft shadow-glass",
    },
    padding: {
      none: "",
      sm: "p-3",
      md: "p-4 sm:p-5",
      lg: "p-4 sm:p-7",
    },
  },
  defaultVariants: { variant: "default", padding: "md" },
});

export interface GlassCardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassVariants> {
  /** Enable hover lift + refraction sheen. */
  hover?: boolean;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant, padding, hover = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        glassVariants({ variant, padding }),
        hover &&
          "glass-sheen transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glass-lg",
        className,
      )}
      {...props}
    />
  ),
);
GlassCard.displayName = "GlassCard";

export interface GlassPanelProps extends HTMLMotionProps<"section"> {
  variant?: "default" | "strong" | "gradient";
}

/** Animated glass section — fades/slides in when scrolled into view. */
export const GlassPanel = forwardRef<HTMLElement, GlassPanelProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, ease: [0.21, 0.6, 0.35, 1] }}
      className={cn(
        "rounded-glass",
        variant === "strong" ? "glass-strong" : variant === "gradient" ? "gradient-border-soft" : "glass",
        className,
      )}
      {...props}
    />
  ),
);
GlassPanel.displayName = "GlassPanel";

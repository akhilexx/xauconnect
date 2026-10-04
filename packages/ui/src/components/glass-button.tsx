"use client";

/**
 * GlassButton — primary interactive element.
 *
 * Variants
 *   gold      filled gold gradient (primary CTA)
 *   glass     translucent glass with gradient border
 *   ghost     borderless, hover tint
 *   danger    destructive actions
 * Sizes: sm / md / lg / icon
 */
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "../lib/cn.js";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        gold: "bg-gold-gradient text-ink shadow-gold-glow hover:brightness-105 hover:shadow-gold-glow",
        glass:
          "gradient-border-soft text-ink shadow-glass hover:shadow-glass-lg hover:-translate-y-px",
        ghost: "text-ink-soft hover:bg-gold/10 hover:text-ink",
        danger: "bg-danger text-white shadow-sm hover:bg-danger/90",
      },
      size: {
        sm: "h-9 min-h-9 px-3 text-xs sm:h-8 sm:min-h-8",
        md: "h-11 min-h-11 px-5 text-sm",
        lg: "h-12 min-h-12 px-6 text-base py-3 sm:h-14 sm:min-h-14 sm:px-7 sm:py-3.5",
        icon: "h-11 w-11 sm:h-10 sm:w-10",
      },
    },
    defaultVariants: { variant: "gold", size: "md" },
  },
);

export interface GlassButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, variant, size, loading = false, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  ),
);
GlassButton.displayName = "GlassButton";

export { buttonVariants };

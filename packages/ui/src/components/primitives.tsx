"use client";

/**
 * Small shadcn-style primitives shared across the app:
 * Skeleton, Badge, GlassInput, Spinner, StatCard, Tabs.
 */
import {
  createContext,
  forwardRef,
  useContext,
  useId,
  useState,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { motion } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn.js";

// ─── Skeleton ────────────────────────────────────────────────────────────────

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-xl bg-[linear-gradient(110deg,#eef0f3_30%,#f8f9fa_45%,#eef0f3_60%)] bg-[length:200%_100%]",
        className,
      )}
      {...props}
    />
  );
}

// ─── Badge ───────────────────────────────────────────────────────────────────

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
  {
    variants: {
      tone: {
        gold: "bg-gold/15 text-gold-dark ring-1 ring-gold/40",
        pink: "bg-blush/10 text-blush ring-1 ring-blush/30",
        success: "bg-success/10 text-success ring-1 ring-success/30",
        danger: "bg-danger/10 text-danger ring-1 ring-danger/30",
        neutral: "bg-ink/5 text-ink-soft ring-1 ring-ink/10",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

// ─── GlassInput ──────────────────────────────────────────────────────────────

export interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  ({ className, label, error, id: idProp, ...props }, ref) => {
    const generated = useId();
    const id = idProp ?? generated;
    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "glass-field h-11 w-full rounded-2xl px-4 text-base text-ink placeholder:text-ink-faint sm:text-sm",
            "focus:outline-none focus:ring-2 focus:ring-gold/50 transition-shadow",
            error && "ring-2 ring-danger/50",
            className,
          )}
          aria-invalid={Boolean(error)}
          {...props}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  },
);
GlassInput.displayName = "GlassInput";

// ─── Spinner ─────────────────────────────────────────────────────────────────

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-5 w-5 animate-spin rounded-full border-2 border-gold border-t-transparent",
        className,
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

// ─── StatCard ────────────────────────────────────────────────────────────────

export interface StatCardProps {
  label: string;
  value: number;
  format?: (n: number) => string;
  icon?: ReactNode;
  delta?: string;
  deltaTone?: "success" | "danger" | "neutral";
  className?: string;
}

/** Metric tile used on the landing page and admin dashboard. */
export function StatCard({
  label,
  value,
  format,
  icon,
  delta,
  deltaTone = "neutral",
  className,
}: StatCardProps) {
  const display = format ? format(value) : String(value);
  return (
    <div className={cn("glass rounded-glass p-3 glass-sheen sm:p-5", className)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
        {icon && <span className="text-gold-deep">{icon}</span>}
      </div>
      <p className="mt-2 font-display text-2xl font-bold tabular-nums text-ink">{display}</p>
      {delta && (
        <p
          className={cn(
            "mt-1 text-xs font-medium",
            deltaTone === "success" && "text-success",
            deltaTone === "danger" && "text-danger",
            deltaTone === "neutral" && "text-ink-muted",
          )}
        >
          {delta}
        </p>
      )}
    </div>
  );
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

interface TabsContextValue {
  value: string;
  setValue: (v: string) => void;
  layoutId: string;
}
const TabsContext = createContext<TabsContextValue | null>(null);

export function Tabs({
  defaultValue,
  value: controlled,
  onValueChange,
  children,
  className,
}: {
  defaultValue?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  children: ReactNode;
  className?: string;
}) {
  const [internal, setInternal] = useState(defaultValue ?? "");
  const layoutId = useId();
  const value = controlled ?? internal;
  const setValue = (v: string) => {
    setInternal(v);
    onValueChange?.(v);
  };
  return (
    <TabsContext.Provider value={{ value, setValue, layoutId }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("glass inline-flex items-center gap-1 rounded-2xl p-1", className)} role="tablist">
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children }: { value: string; children: ReactNode }) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("TabsTrigger must be used inside <Tabs>");
  const active = ctx.value === value;
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={() => ctx.setValue(value)}
      className={cn(
        "relative min-h-11 rounded-xl px-4 py-2 text-sm font-semibold transition-colors sm:min-h-0 sm:py-1.5",
        active ? "text-ink" : "text-ink-muted hover:text-ink-soft",
      )}
    >
      {active && (
        <motion.span
          layoutId={ctx.layoutId}
          className="absolute inset-0 rounded-xl bg-gold-gradient shadow-gold-glow"
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("TabsContent must be used inside <Tabs>");
  if (ctx.value !== value) return null;
  return (
    <motion.div
      role="tabpanel"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

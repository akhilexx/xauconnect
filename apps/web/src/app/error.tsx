"use client";

/** Global error boundary — Liquid Glass styled recovery screen. */
import { AlertTriangle } from "lucide-react";
import { GlassButton, GlassCard } from "@xauconnect/ui";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <GlassCard variant="strong" padding="lg" className="max-w-md text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 ring-1 ring-danger/30">
          <AlertTriangle className="h-6 w-6 text-danger" />
        </span>
        <h1 className="mt-4 font-display text-xl font-extrabold">Something went wrong</h1>
        <p className="mt-2 text-sm text-ink-muted">
          {error.message?.slice(0, 160) || "An unexpected error occurred."}
        </p>
        {error.digest && <p className="mt-1 text-xs text-ink-faint">Ref: {error.digest}</p>}
        <GlassButton className="mt-5" onClick={reset}>
          Try again
        </GlassButton>
      </GlassCard>
    </div>
  );
}

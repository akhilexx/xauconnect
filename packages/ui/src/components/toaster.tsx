"use client";

/**
 * XauToaster — Sonner toaster pre-styled for the Liquid Glass theme.
 * Mount once in the root layout; trigger with `toast` from "sonner".
 */
import { Toaster as SonnerToaster } from "sonner";

export { toast } from "sonner";

export function XauToaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      gap={10}
      offset={16}
      mobileOffset={16}
      toastOptions={{
        classNames: {
          toast:
            "glass-strong !rounded-2xl !border-white/70 !text-ink !shadow-glass-lg font-sans",
          title: "!font-semibold",
          description: "!text-ink-muted",
          actionButton: "!bg-gold-gradient !text-ink !rounded-xl",
          success: "!ring-1 !ring-success/30",
          error: "!ring-1 !ring-danger/30",
        },
      }}
    />
  );
}

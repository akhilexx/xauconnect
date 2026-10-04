"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { getMobileWalletHint } from "@/lib/mobile-wallet";
import { useActiveWallet } from "@/hooks/use-active-wallet";

/** Dismissible banner for mobile / in-app browser wallet connect guidance. */
export function MobileWalletBanner() {
  const hint = getMobileWalletHint();
  const { isConnected } = useActiveWallet();
  const [dismissed, setDismissed] = useState(false);

  if (!hint || isConnected || dismissed) return null;

  return (
    <div
      role="status"
      className="mb-4 flex gap-3 rounded-xl border border-gold/30 bg-gold/10 px-3 py-2.5 text-sm text-ink-soft sm:px-4"
    >
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{hint.title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-muted sm:text-sm">{hint.body}</p>
      </div>
      <button
        type="button"
        className="shrink-0 rounded-lg p-1 text-ink-muted hover:bg-white/50 hover:text-ink"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

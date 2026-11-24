"use client";

import { useState } from "react";
import { cn } from "@xauconnect/ui";
import { AdminWalletsPanel } from "./admin-wallets-panel";
import { ConnectedWalletsPanel } from "./connected-wallets-panel";

const TABS = [
  { id: "connected", label: "Connected users" },
  { id: "treasury", label: "Protocol treasury" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AdminWalletsSection() {
  const [tab, setTab] = useState<TabId>("connected");

  return (
    <div className="flex flex-col gap-4">
      <nav
        aria-label="Wallet views"
        className="glass grid w-full grid-cols-2 gap-1 rounded-2xl p-1 sm:inline-flex sm:w-fit"
      >
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "min-h-11 rounded-xl px-3.5 py-2 text-sm font-semibold transition",
              tab === id
                ? "bg-gold-gradient text-ink shadow-gold-glow"
                : "text-ink-muted hover:text-ink",
            )}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === "connected" ? <ConnectedWalletsPanel /> : <AdminWalletsPanel />}
    </div>
  );
}

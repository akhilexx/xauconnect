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
      <nav className="glass inline-flex max-w-full gap-1 overflow-x-auto rounded-xl p-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "rounded-lg px-3.5 py-1.5 text-sm font-semibold transition",
              tab === id ? "bg-gold-gradient text-ink shadow-gold-glow" : "text-ink-muted hover:text-ink",
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

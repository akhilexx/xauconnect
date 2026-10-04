"use client";

/**
 * AdminDashboard — role-gated admin console at /xaxmd5.
 */
import { useState } from "react";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { BRAND_NAV_ICONS } from "@xauconnect/utils";
import { GlassButton, Skeleton, cn } from "@xauconnect/ui";
import { logoutAdmin, useAdminSessionGuard } from "@/lib/session";
import { BrandGlyph } from "@/components/brand-glyph";
import { BrandMark } from "@/components/brand-logo";
import { MetricsOverview } from "./metrics-overview";
import { FeeConfigPanel } from "./fee-config-panel";
import { ListingQueue } from "./listing-queue";
import { UsersTable } from "./users-table";
import { AuditLogPanel } from "./audit-log-panel";
import { AdminWalletsSection } from "./admin-wallets-section";
import { AdminSwapsPanel } from "./admin-swaps-panel";
import { AdminApiAgentsPanel } from "./admin-api-agents-panel";
import { FiatTransactionsPanel } from "./fiat-transactions-panel";

type SectionId =
  | "metrics"
  | "swaps"
  | "fiat"
  | "agents"
  | "fees"
  | "wallets"
  | "listings"
  | "users"
  | "audit";

const SECTIONS: Array<{ id: SectionId; label: string; mark: string }> = [
  { id: "metrics", label: "Metrics", mark: BRAND_NAV_ICONS.metrics },
  { id: "swaps", label: "Swaps", mark: BRAND_NAV_ICONS.swap },
  { id: "fiat", label: "Buy/Sell", mark: BRAND_NAV_ICONS.buySell },
  { id: "agents", label: "API Agents", mark: BRAND_NAV_ICONS.agents },
  { id: "fees", label: "Fee Config", mark: BRAND_NAV_ICONS.fees },
  { id: "wallets", label: "Wallets", mark: BRAND_NAV_ICONS.wallet },
  { id: "listings", label: "Listings", mark: BRAND_NAV_ICONS.admin },
  { id: "users", label: "Users", mark: BRAND_NAV_ICONS.users },
  { id: "audit", label: "Audit Log", mark: BRAND_NAV_ICONS.audit },
];

export function AdminDashboard() {
  const router = useRouter();
  const { sessionReady, isAdmin } = useAdminSessionGuard();
  const [section, setSection] = useState<SectionId>("metrics");

  if (!sessionReady || !isAdmin) {
    return (
      <div className="mx-auto flex w-full flex-col gap-5">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full flex-col gap-5 px-1 sm:px-0">
      <header className="flex flex-col gap-3">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <BrandMark size={44} className="mt-0.5 hidden shrink-0 overflow-visible sm:block" />
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                Admin <span className="gold-text">console</span>
              </h1>
              <p className="mt-1 text-sm text-ink-muted">
                Connected wallets, users, metrics, fees, listings, and audit trail.
              </p>
            </div>
          </div>
          <GlassButton
            variant="ghost"
            size="sm"
            className="shrink-0 rounded-full"
            onClick={() => logoutAdmin(router, "signout")}
            aria-label="Sign out of admin console"
          >
            <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
          </GlassButton>
        </div>
        <nav className="scroll-x-tabs flex max-w-[calc(100%+0.5rem)] gap-0.5 overflow-x-auto rounded-full bg-white/55 p-1 shadow-[0_1px_2px_rgba(21,23,28,0.04)] ring-1 ring-ink/[0.06] sm:mx-0 sm:max-w-none sm:flex-wrap">
          {SECTIONS.map(({ id, label, mark }) => {
            const active = section === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSection(id)}
                className={cn(
                  "flex h-11 shrink-0 items-center gap-2 rounded-full px-3 text-[13px] font-medium tracking-tight transition-colors whitespace-nowrap sm:h-9",
                  active
                    ? "bg-white text-ink shadow-[0_1px_2px_rgba(21,23,28,0.06)] ring-1 ring-gold/25"
                    : "text-ink-muted hover:bg-white/70 hover:text-ink",
                )}
              >
                <BrandGlyph src={mark} size={18} />
                {label}
              </button>
            );
          })}
        </nav>
      </header>

      {section === "metrics" && <MetricsOverview />}
      {section === "swaps" && <AdminSwapsPanel />}
      {section === "fiat" && <FiatTransactionsPanel />}
      {section === "agents" && <AdminApiAgentsPanel />}
      {section === "fees" && <FeeConfigPanel />}
      {section === "wallets" && <AdminWalletsSection />}
      {section === "listings" && <ListingQueue />}
      {section === "users" && <UsersTable />}
      {section === "audit" && <AuditLogPanel />}
    </div>
  );
}

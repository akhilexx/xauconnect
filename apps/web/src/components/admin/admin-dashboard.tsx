"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, ShieldCheck } from "lucide-react";
import { BRAND_NAV_ICONS } from "@xauconnect/utils";
import { BrandGlyph } from "@/components/brand-glyph";
import { PageHeader } from "@/components/page-header";
import { useRouter } from "next/navigation";
import { Badge, GlassButton, GlassCard, Skeleton, cn } from "@xauconnect/ui";
import { logoutAdmin, useAdminSessionGuard } from "@/lib/session";
import { MetricsOverview } from "./metrics-overview";
import { FeeConfigPanel } from "./fee-config-panel";
import { ListingQueue } from "./listing-queue";
import { UsersTable } from "./users-table";
import { AuditLogPanel } from "./audit-log-panel";
import { AdminWalletsSection } from "./admin-wallets-section";
import { AdminSwapsPanel } from "./admin-swaps-panel";
import { AdminApiAgentsPanel } from "./admin-api-agents-panel";
import { FiatTransactionsPanel } from "./fiat-transactions-panel";
import "./console.css";

const pages = [
  {
    id: "overview",
    name: "Overview",
    mark: BRAND_NAV_ICONS.metrics,
    group: "Monitor",
    desc: "Settlement activity and protocol health.",
    panel: MetricsOverview,
  },
  {
    id: "swaps",
    name: "Swap ledger",
    mark: BRAND_NAV_ICONS.swap,
    group: "Monitor",
    desc: "Inspect settled amounts, collected fees and transaction receipts.",
    panel: AdminSwapsPanel,
  },
  {
    id: "fiat",
    name: "Fiat activity",
    mark: BRAND_NAV_ICONS.buySell,
    group: "Monitor",
    desc: "Follow buy and sell orders through provider settlement.",
    panel: FiatTransactionsPanel,
  },
  {
    id: "agents",
    name: "API activity",
    mark: BRAND_NAV_ICONS.agents,
    group: "Monitor",
    desc: "Request traffic, integrations and execution activity.",
    panel: AdminApiAgentsPanel,
  },
  {
    id: "wallets",
    name: "Wallets",
    mark: BRAND_NAV_ICONS.wallet,
    group: "Operations",
    desc: "Review treasury holdings and connected wallets.",
    panel: AdminWalletsSection,
  },
  {
    id: "fees",
    name: "Fee settings",
    mark: BRAND_NAV_ICONS.fees,
    group: "Operations",
    desc: "Manage protocol rates across networks.",
    panel: FeeConfigPanel,
  },
  {
    id: "listings",
    name: "Listing queue",
    mark: BRAND_NAV_ICONS.admin,
    group: "Operations",
    desc: "Review tokens awaiting a listing decision.",
    panel: ListingQueue,
  },
  {
    id: "users",
    name: "Users",
    mark: BRAND_NAV_ICONS.users,
    group: "Governance",
    desc: "Find accounts, review identity and manage access.",
    panel: UsersTable,
  },
  {
    id: "audit",
    name: "Audit trail",
    mark: BRAND_NAV_ICONS.audit,
    group: "Governance",
    desc: "Review administrative decisions and changes.",
    panel: AuditLogPanel,
  },
] as const;
type Section = (typeof pages)[number]["id"];
function sectionFromHash(): Section {
  return pages.find((p) => "#" + p.id === location.hash)?.id ?? "overview";
}

export function AdminDashboard() {
  const router = useRouter(),
    { sessionReady, isAdmin, restoreError, retryRestore } = useAdminSessionGuard();
  const [section, setSection] = useState<Section>("overview"),
    [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null),
    heading = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sync = () => {
      setSection(sectionFromHash());
      setOpen(false);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open]);
  const page = pages.find((p) => p.id === section)!,
    Panel = page.panel;
  if (restoreError)
    return (
      <GlassCard className="mx-auto max-w-md space-y-3">
        <p>Could not check your saved admin login.</p>
        <GlassButton variant="glass" onClick={() => void retryRestore()}>
          Try again
        </GlassButton>
      </GlassCard>
    );
  if (!sessionReady || !isAdmin)
    return (
      <div className="p-8" aria-label="Checking admin session">
        <Skeleton className="h-72 w-full" />
      </div>
    );
  return (
    <div className="admin-workspace mx-auto grid w-full max-w-[100rem] min-w-0 items-start gap-4 lg:grid-cols-[12.5rem_minmax(0,1fr)] lg:gap-6">
      <GlassCard
        padding="sm"
        className="min-w-0 lg:sticky lg:top-[calc(5rem+env(safe-area-inset-top))] lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto"
      >
        <div className="flex items-center gap-2 px-2 py-1.5">
          <BrandGlyph src={BRAND_NAV_ICONS.admin} size={28} />
          <span className="font-display text-base font-extrabold tracking-tight">
            Admin console
          </span>
          <button
            ref={toggle}
            type="button"
            aria-label={open ? "Close admin sections" : "Open admin sections"}
            aria-controls="admin-navigation"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="ml-auto flex min-h-11 items-center gap-1 rounded-full bg-white/70 px-3 text-xs font-semibold text-ink ring-1 ring-ink/10 lg:hidden"
          >
            Sections{" "}
            <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} />
          </button>
        </div>
        <div
          id="admin-navigation"
          className={cn(
            "border-t border-ink/[0.06] pt-2 lg:mt-2 lg:block",
            open ? "block" : "hidden",
          )}
        >
          <nav aria-label="Admin sections">
            {["Monitor", "Operations", "Governance"].map((group) => (
              <div key={group} className="mb-2">
                <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  {group}
                </p>
                <div className="grid grid-cols-2 gap-1 lg:grid-cols-1">
                  {pages
                    .filter((p) => p.group === group)
                    .map((p) => (
                      <a
                        key={p.id}
                        href={"#" + p.id}
                        aria-current={p.id === section ? "page" : undefined}
                        onClick={() => {
                          setSection(p.id);
                          setOpen(false);
                          requestAnimationFrame(() => {
                            heading.current?.focus({ preventScroll: true });
                            heading.current?.scrollIntoView({
                              block: "nearest",
                              behavior: "instant",
                            });
                          });
                        }}
                        className={cn(
                          "flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors",
                          p.id === section
                            ? "bg-white/90 text-ink shadow-sm ring-1 ring-gold/45"
                            : "text-ink-muted hover:bg-white/75 hover:text-ink",
                        )}
                      >
                        <BrandGlyph src={p.mark} size={19} />
                        {p.name}
                      </a>
                    ))}
                </div>
              </div>
            ))}
          </nav>
          <div className="mt-3 border-t border-ink/[0.06] pt-2">
            <GlassButton size="sm" variant="ghost" onClick={() => logoutAdmin(router, "signout")}>
              <LogOut size={14} /> Sign out
            </GlassButton>
          </div>
        </div>
      </GlassCard>
      <div className="min-w-0">
        <div
          ref={heading}
          tabIndex={-1}
          className="mb-4 flex min-w-0 flex-wrap items-start justify-between gap-3 outline-none sm:mb-5"
        >
          <PageHeader description={page.desc}>
            <span className="gold-text">{page.name}</span>
          </PageHeader>
          <Badge tone="neutral">
            <ShieldCheck size={13} /> Admin session
          </Badge>
        </div>
        <section key={section} className="admin-section min-w-0" aria-label={page.name}>
          <Panel />
        </section>
      </div>
    </div>
  );
}

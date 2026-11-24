"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowLeftRight,
  Blocks,
  BookOpenCheck,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings2,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Skeleton } from "@xauconnect/ui";
import { logoutAdmin, useAdminSessionGuard } from "@/lib/session";
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
import "./console.css";

const pages = [
  {
    id: "overview",
    name: "Overview",
    icon: LayoutDashboard,
    group: "Monitor",
    desc: "Settlement activity and protocol health.",
    panel: MetricsOverview,
  },
  {
    id: "swaps",
    name: "Swap ledger",
    icon: ArrowLeftRight,
    group: "Monitor",
    desc: "Inspect settled amounts, collected fees and transaction receipts.",
    panel: AdminSwapsPanel,
  },
  {
    id: "fiat",
    name: "Fiat activity",
    icon: CreditCard,
    group: "Monitor",
    desc: "Follow buy and sell orders through provider settlement.",
    panel: FiatTransactionsPanel,
  },
  {
    id: "agents",
    name: "API activity",
    icon: Activity,
    group: "Monitor",
    desc: "Request traffic, integrations and execution activity.",
    panel: AdminApiAgentsPanel,
  },
  {
    id: "wallets",
    name: "Wallets",
    icon: Wallet,
    group: "Operations",
    desc: "Review treasury holdings and connected wallets.",
    panel: AdminWalletsSection,
  },
  {
    id: "fees",
    name: "Fee settings",
    icon: Settings2,
    group: "Operations",
    desc: "Manage protocol rates across networks.",
    panel: FeeConfigPanel,
  },
  {
    id: "listings",
    name: "Listing queue",
    icon: Blocks,
    group: "Operations",
    desc: "Review tokens awaiting a listing decision.",
    panel: ListingQueue,
  },
  {
    id: "users",
    name: "Users",
    icon: Users,
    group: "Governance",
    desc: "Find accounts, review identity and manage access.",
    panel: UsersTable,
  },
  {
    id: "audit",
    name: "Audit trail",
    icon: BookOpenCheck,
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
    { sessionReady, isAdmin } = useAdminSessionGuard();
  const [section, setSection] = useState<Section>("overview"),
    [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null),
    heading = useRef<HTMLHeadingElement>(null);
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
  if (!sessionReady || !isAdmin)
    return (
      <div className="p-8" aria-label="Checking admin session">
        <Skeleton className="h-72 w-full" />
      </div>
    );
  return (
    <div className="ops">
      <a className="ops-skip" href="#ops-main">
        Skip to content
      </a>
      <aside className="ops-rail">
        <div className="ops-brand">
          <BrandMark size={36} />
          <div>
            <strong>XAUConnect</strong>
            <small>Operator workspace</small>
          </div>
          <button
            ref={toggle}
            className="ops-toggle"
            aria-controls="ops-navigation"
            aria-expanded={open}
            aria-label={open ? "Close navigation" : "Open navigation"}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
        <div id="ops-navigation" className={"ops-navwrap" + (open ? " is-open" : "")}>
          <nav aria-label="Admin sections">
            {["Monitor", "Operations", "Governance"].map((group) => (
              <div className="ops-navgroup" key={group}>
                <span>{group}</span>
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
                        requestAnimationFrame(() =>
                          heading.current?.focus({ preventScroll: true }),
                        );
                      }}
                    >
                      <p.icon size={16} />
                      {p.name}
                      <ChevronRight size={13} />
                    </a>
                  ))}
              </div>
            ))}
          </nav>
          <div className="ops-railfoot">
            <Link href="/">
              <ArrowLeft size={16} />
              Back to site
            </Link>
            <button onClick={() => logoutAdmin(router, "signout")}>
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>
      </aside>
      <div className="ops-work" id="ops-main">
        <div className="ops-top">
          <span>
            Workspace <ChevronRight size={12} /> {page.group} <ChevronRight size={12} />{" "}
            <b>{page.name}</b>
          </span>
          <span>
            <ShieldCheck size={15} /> Admin session
          </span>
        </div>
        <div className="ops-content">
          <header className="ops-heading">
            <small>
              {page.group} / {String(pages.indexOf(page) + 1).padStart(2, "0")}
            </small>
            <h1 tabIndex={-1} ref={heading}>
              {page.name}
            </h1>
            <p>{page.desc}</p>
          </header>
          <section key={section} className="ops-enter" aria-label={page.name}>
            <Panel />
          </section>
        </div>
      </div>
    </div>
  );
}

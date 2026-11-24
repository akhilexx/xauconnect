"use client";

/**
 * AdminLoginPanel — dedicated console authentication, separate from the
 * public wallet flow. Two paths into the ADMIN role:
 *   1. Console email + password (ADMIN_EMAIL / ADMIN_PASSWORD) -> admin JWT
 *   2. Wallet sign-in with an allowlisted address (handled in the navbar)
 */
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AtSign, Eye, EyeOff, KeyRound, Lock } from "lucide-react";
import { GlassButton, GlassCard, Skeleton, toast } from "@xauconnect/ui";
import { BRAND_NAV_ICONS } from "@xauconnect/utils";
import { api } from "@/lib/api";
import { ADMIN_CONSOLE_PATH } from "@/lib/admin-path";
import { clearAdminQueries } from "@/lib/query-client";
import { logoutAdmin, useRememberedAdmin } from "@/lib/session";
import { useSessionStore } from "@/lib/store";
import { BrandGlyph } from "@/components/brand-glyph";

export function AdminLoginPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useSessionStore();
  const { sessionReady, isAdmin, restoreError, retryRestore } = useRememberedAdmin(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const reason = searchParams.get("reason");
  const sessionNotice =
    reason === "session_expired"
      ? "Your session expired. Please sign in again."
      : reason === "signout"
        ? "You have been signed out."
        : null;
  useEffect(() => {
    if (sessionReady && isAdmin && !restoreError) router.replace(ADMIN_CONSOLE_PATH);
  }, [sessionReady, isAdmin, restoreError, router]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      const { token, role } = await api.adminLogin(email, password);
      clearAdminQueries();
      setSession({ token, address: "admin:console", role });
      toast.success("Welcome back, operator");
      router.replace(ADMIN_CONSOLE_PATH);
    } catch (err) {
      toast.error("Login failed", { description: (err as Error).message.slice(0, 120) });
    } finally {
      setLoading(false);
    }
  }

  if (restoreError)
    return (
      <GlassCard className="mx-auto max-w-md space-y-3">
        <p>Could not check your saved admin login.</p>
        <GlassButton variant="glass" onClick={() => void retryRestore()}>
          Try again
        </GlassButton>
      </GlassCard>
    );
  if (!sessionReady) return <Skeleton className="mx-auto h-64 w-full max-w-md" />;
  return (
    <GlassCard variant="gradient" padding="lg" className="mx-auto my-4 w-full max-w-md sm:my-10">
      <div className="flex items-start gap-3">
        <BrandGlyph src={BRAND_NAV_ICONS.admin} size={36} />
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">
            Admin <span className="gold-text">sign in</span>
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Access the settlement ledger and protocol controls.
          </p>
        </div>
      </div>
      {sessionNotice && (
        <p className="relative mt-4 rounded-2xl bg-gold/10 px-4 py-3 text-center text-sm font-semibold text-ink ring-1 ring-gold/30">
          {sessionNotice}
        </p>
      )}

      {isAdmin ? (
        <div className="relative mt-6 flex flex-col gap-3">
          <p className="rounded-2xl bg-success/10 px-4 py-3 text-center text-sm font-semibold text-success ring-1 ring-success/30">
            You are signed in as an administrator.
          </p>
          <GlassButton size="lg" onClick={() => router.push(ADMIN_CONSOLE_PATH)}>
            <KeyRound className="h-4 w-4" /> Enter console
          </GlassButton>
          <GlassButton
            variant="ghost"
            size="sm"
            onClick={() => void logoutAdmin(router, "signout")}
          >
            Sign out
          </GlassButton>
        </div>
      ) : (
        <form onSubmit={login} className="relative mt-6 flex flex-col gap-4">
          <div className="gradient-border-soft rounded-2xl p-4">
            <label
              htmlFor="admin-email"
              className="text-xs font-semibold uppercase tracking-wider text-ink-muted"
            >
              Admin email
            </label>
            <div className="mt-1.5 flex items-center gap-2">
              <AtSign className="h-4 w-4 shrink-0 text-ink-faint" />
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@xauconnect.io"
                autoComplete="username"
                className="w-full bg-transparent text-base font-semibold text-ink outline-none placeholder:text-ink-faint"
              />
            </div>
          </div>

          <div className="gradient-border-soft rounded-2xl p-4">
            <label
              htmlFor="admin-password"
              className="text-xs font-semibold uppercase tracking-wider text-ink-muted"
            >
              Password
            </label>
            <div className="mt-1.5 flex items-center gap-2">
              <Lock className="h-4 w-4 shrink-0 text-ink-faint" />
              <input
                id="admin-password"
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="current-password"
                className="w-full bg-transparent text-lg font-semibold text-ink outline-none placeholder:text-ink-faint"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="text-ink-faint hover:text-ink"
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <GlassButton
            size="lg"
            type="submit"
            disabled={!email || !password || loading}
            loading={loading}
          >
            <KeyRound className="h-4 w-4" /> Sign in to console
          </GlassButton>

          <p className="text-center text-xs text-ink-faint">
            Admins with an allowlisted wallet can also connect &amp; sign in from the navbar — the
            ADMIN role is granted automatically.
          </p>
        </form>
      )}
    </GlassCard>
  );
}

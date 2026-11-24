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
import { GlassButton, GlassCard, toast } from "@xauconnect/ui";
import { BRAND_NAV_ICONS } from "@xauconnect/utils";
import { api } from "@/lib/api";
import { ADMIN_CONSOLE_PATH } from "@/lib/admin-path";
import { clearAdminQueries } from "@/lib/query-client";
import { useSessionStore } from "@/lib/store";
import { BrandGlyph } from "@/components/brand-glyph";

export function AdminLoginPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { role, setSession, clearSession } = useSessionStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  useEffect(() => {
    const reason = searchParams.get("reason");
    if (reason === "session_expired") {
      clearSession();
      clearAdminQueries();
      setSessionNotice("Your session expired. Please sign in again.");
      toast.error("Session expired", { description: "Sign in to continue." });
    } else if (reason === "signout") {
      clearSession();
      clearAdminQueries();
      setSessionNotice("You have been signed out.");
    }
  }, [searchParams, clearSession]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      const { token, role } = await api.adminLogin(email, password);
      clearAdminQueries();
      setSession({ token, address: "admin:console", role });
      toast.success("Welcome back, operator");
      router.push(ADMIN_CONSOLE_PATH);
    } catch (err) {
      toast.error("Login failed", { description: (err as Error).message.slice(0, 120) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlassCard variant="strong" padding="lg" className="relative overflow-hidden">
      <div className="rounded-2xl bg-[#17372e] px-6 py-7 text-white">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#dac78d]">XAUConnect / Operations</p>
        <h1 className="font-serif text-4xl tracking-tight">Operator sign in</h1>
        <p className="mt-2 text-sm text-[#d2dece]">Access the settlement ledger and protocol controls.</p>
      </div>

      {sessionNotice && (
        <p className="relative mt-4 rounded-2xl bg-gold/10 px-4 py-3 text-center text-sm font-semibold text-ink ring-1 ring-gold/30">
          {sessionNotice}
        </p>
      )}

      {role === "ADMIN" ? (
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
            onClick={() => {
              void api.signOut().catch(()=>{});
              clearSession();
              clearAdminQueries();
              setSessionNotice("You have been signed out.");
              toast.success("Signed out");
            }}
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
            Admins with an allowlisted wallet can also connect &amp; sign in from the navbar —
            the ADMIN role is granted automatically.
          </p>
        </form>
      )}
    </GlassCard>
  );
}

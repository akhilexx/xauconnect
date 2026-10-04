"use client";

/**
 * Session hydration + admin auth helpers.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { XauApiError } from "@xauconnect/sdk";
import { toast } from "@xauconnect/ui";
import { api } from "./api";
import { ADMIN_LOGIN_PATH } from "@/lib/admin-path";
import { clearAdminQueries } from "./query-client";
import { useSessionStore } from "./store";

const STORAGE_KEY = "xau-session";

/** Eagerly attach the saved JWT to the API client (call once on app boot). */
export function bootstrapSessionToken(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { state?: { token?: string } };
    if (parsed.state?.token) api.setToken(parsed.state.token);
  } catch {
    /* ignore corrupt storage */
  }
}

/** True after zustand persist has rehydrated from localStorage. */
export function useSessionReady(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    bootstrapSessionToken();
    const finish = () => {
      const token = useSessionStore.getState().token;
      if (token) api.setToken(token);
      setReady(true);
    };
    if (useSessionStore.persist.hasHydrated()) finish();
    else return useSessionStore.persist.onFinishHydration(finish);
  }, []);

  return ready;
}

/** True when hydration is done and the user has an admin session token. */
export function useAdminReady(): boolean {
  const ready = useSessionReady();
  const { token, role } = useSessionStore();
  return ready && role === "ADMIN" && Boolean(token);
}

export function isSessionAuthError(error: unknown): boolean {
  if (error instanceof XauApiError) {
    return error.status === 401 || error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN";
  }
  const msg = (error as Error)?.message?.toLowerCase() ?? "";
  return (
    msg.includes("session token") ||
    msg.includes("unauthorized") ||
    msg.includes("admin role") ||
    msg.includes("missing authorization")
  );
}

/** Clear session and API token. */
export function logoutSession(): void {
  useSessionStore.getState().clearSession();
  clearAdminQueries();
}

/**
 * Sign out of the admin console and redirect to login.
 * Use when the JWT is missing, expired, or rejected by the API.
 */
export function logoutAdmin(router?: { replace: (url: string) => void }, reason?: string): void {
  logoutSession();
  const query = reason ? `?reason=${reason}` : "";
  const target = `${ADMIN_LOGIN_PATH}${query}`;
  if (router) router.replace(target);
  else if (typeof window !== "undefined") window.location.href = target;
}

/** Redirect to login when admin session is absent after hydration. */
export function useAdminSessionGuard(): { sessionReady: boolean; isAdmin: boolean } {
  const router = useRouter();
  const sessionReady = useSessionReady();
  const { role, token } = useSessionStore();
  const isAdmin = sessionReady && role === "ADMIN" && Boolean(token);

  useEffect(() => {
    if (!sessionReady) return;
    if (!isAdmin) router.replace(ADMIN_LOGIN_PATH);
  }, [sessionReady, isAdmin, router]);

  return { sessionReady, isAdmin };
}

/** React to expired/invalid tokens from admin API responses. */
export function useAdminAuthErrorHandler(error: unknown, enabled = true): void {
  const router = useRouter();
  const adminReady = useAdminReady();

  useEffect(() => {
    // Require a live admin session so cached 401s from a prior logout cannot
    // immediately kick a freshly signed-in user back out.
    if (!enabled || !adminReady || !error || !isSessionAuthError(error)) return;
    toast.error("Session expired", { description: "Please sign in again." });
    logoutAdmin(router, "session_expired");
  }, [enabled, adminReady, error, router]);
}

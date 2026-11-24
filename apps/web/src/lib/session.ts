"use client";

/**
 * Session hydration + admin auth helpers.
 */
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  if (error instanceof XauApiError) return error.status === 401;
  return /invalid or expired session token|missing authorization header|admin session expired/i.test(
    (error as Error)?.message ?? "",
  );
}

function clearLocalSession() {
  useSessionStore.getState().clearSession();
  clearAdminQueries();
}

/** Explicit sign-out is complete only after the server revokes the credential. */
export async function logoutSession(): Promise<void> {
  try {
    if (useSessionStore.getState().token) await api.signOut();
  } catch (error) {
    if (!isSessionAuthError(error)) throw error;
  }
  clearLocalSession();
}

export async function logoutAdmin(router?: { replace: (url: string) => void }, reason?: string) {
  if (reason === "session_expired") clearLocalSession();
  else {
    try {
      await logoutSession();
    } catch {
      toast.error("Could not sign out. Please try again.");
      return;
    }
  }
  const target = reason ? `${ADMIN_LOGIN_PATH}?reason=${reason}` : ADMIN_LOGIN_PATH;
  if (router) router.replace(target);
  else if (typeof window !== "undefined") window.location.href = target;
}

/** If browser UI storage is missing, recover the identity from the server before
 * redirecting. A network or database outage must not erase a remembered login. */
export function useRememberedAdmin(checkKnownCookie = false) {
  const ready = useSessionReady();
  const { token, role, address, setSession, clearSession } = useSessionStore();
  const check = ready && (!token || (checkKnownCookie && token === "cookie-session"));
  const probe = useQuery({
    queryKey: ["admin-browser-identity", token ?? "no-hint"],
    enabled: check,
    retry: false,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    queryFn: async () => {
      try {
        const { session } = await api.browserAdminIdentity();
        return session.role === "ADMIN" ? session : null;
      } catch (error) {
        if (isSessionAuthError(error)) return null;
        throw error;
      }
    },
  });
  useEffect(() => {
    if (!check || !probe.isSuccess || probe.isFetching) return;
    const identity = probe.data;
    if (
      identity &&
      (token !== "cookie-session" || role !== "ADMIN" || address !== identity.address)
    ) {
      setSession({ token: "cookie-session", address: identity.address, role: "ADMIN" });
    } else if (!identity && token === "cookie-session") {
      clearSession();
    }
  }, [
    check,
    probe.isSuccess,
    probe.isFetching,
    probe.data,
    token,
    role,
    address,
    setSession,
    clearSession,
  ]);
  return {
    sessionReady: ready && (!check || (!probe.isPending && !probe.isFetching)),
    isAdmin: check ? Boolean(probe.data) : ready && role === "ADMIN" && Boolean(token),
    restoreError: check && probe.isError,
    retryRestore: probe.refetch,
  };
}

export function useAdminSessionGuard() {
  const router = useRouter(),
    state = useRememberedAdmin();
  const { sessionReady, isAdmin, restoreError } = state;
  useEffect(() => {
    if (sessionReady && !isAdmin && !restoreError) router.replace(ADMIN_LOGIN_PATH);
  }, [sessionReady, isAdmin, restoreError, router]);
  return state;
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

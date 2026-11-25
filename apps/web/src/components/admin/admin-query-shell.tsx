"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { XauApiError } from "@xauconnect/sdk";
import { GlassButton, GlassCard, Skeleton } from "@xauconnect/ui";
import { isSessionAuthError, useAdminAuthErrorHandler, useAdminReady } from "@/lib/session";

interface AdminQueryShellProps<T> {
  query: UseQueryResult<T, Error>;
  skeletonClass?: string;
  /** Only use for read-only views; do not leave stale mutation controls visible. */
  keepLastData?: boolean;
  children: (data: T) => ReactNode;
}

export function AdminQueryShell<T>({
  query,
  skeletonClass = "h-72 w-full",
  keepLastData = false,
  children,
}: AdminQueryShellProps<T>) {
  const adminReady = useAdminReady();
  useAdminAuthErrorHandler(query.error, adminReady && query.isError);

  if (!adminReady || query.isLoading) {
    return <Skeleton className={skeletonClass} />;
  }

  if (query.isError) {
    if (isSessionAuthError(query.error)) return <Skeleton className={skeletonClass} />;
    if (keepLastData && query.data !== undefined && isTransientAdminError(query.error)) {
      return (
        <div className="grid gap-4">
          <GlassCard
            padding="sm"
            role="status"
            className="flex flex-wrap items-center justify-between gap-2 ring-1 ring-gold/30"
          >
            <p className="px-1 text-sm text-ink-soft">
              {query.isFetching ? "Retrying refresh…" : "Refresh temporarily unavailable."} Showing
              the last successful update.
            </p>
            <GlassButton
              size="sm"
              variant="glass"
              disabled={query.isFetching}
              onClick={() => void query.refetch()}
            >
              Retry
            </GlassButton>
          </GlassCard>
          {children(query.data)}
        </div>
      );
    }
    return <AdminInlineError error={query.error} onRetry={() => void query.refetch()} />;
  }

  if (query.data === undefined) return <Skeleton className={skeletonClass} />;

  return <>{children(query.data)}</>;
}

export function isTransientAdminError(error: Error): boolean {
  if (error instanceof XauApiError) return error.status === 429 || error.status >= 500;
  return error instanceof TypeError || error.name === "TimeoutError";
}

/** Non-query admin panels (e.g. wallets) that handle errors inline. */
export function AdminInlineError({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  useAdminAuthErrorHandler(error, true);
  if (isSessionAuthError(error)) return <Skeleton className="h-64 w-full" />;
  return (
    <GlassCard variant="strong" padding="lg" className="text-center">
      <p className="text-sm font-semibold text-danger">Failed to load admin data</p>
      <p className="mt-1 text-xs text-ink-muted">{error.message}</p>
      {onRetry && (
        <GlassButton size="sm" className="mt-4" onClick={onRetry}>
          Retry
        </GlassButton>
      )}
    </GlassCard>
  );
}

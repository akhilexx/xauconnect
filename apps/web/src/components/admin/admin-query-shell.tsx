"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { GlassButton, GlassCard, Skeleton } from "@xauconnect/ui";
import { isSessionAuthError, useAdminAuthErrorHandler, useAdminReady } from "@/lib/session";

interface AdminQueryShellProps<T> {
  query: UseQueryResult<T, Error>;
  skeletonClass?: string;
  children: (data: T) => ReactNode;
}

export function AdminQueryShell<T>({
  query,
  skeletonClass = "h-72 w-full",
  children,
}: AdminQueryShellProps<T>) {
  const adminReady = useAdminReady();
  useAdminAuthErrorHandler(query.error, adminReady && query.isError);

  if (!adminReady || query.isLoading) {
    return <Skeleton className={skeletonClass} />;
  }

  if (query.isError) {
    return <Skeleton className={skeletonClass} />;
  }

  if (query.data === undefined) {
    return <Skeleton className={skeletonClass} />;
  }

  return <>{children(query.data)}</>;
}

/** Non-query admin panels (e.g. wallets) that handle errors inline. */
export function AdminInlineError({
  error,
  onRetry,
}: {
  error: Error;
  onRetry?: () => void;
}) {
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

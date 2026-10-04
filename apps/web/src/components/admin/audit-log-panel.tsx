"use client";

/**
 * AuditLogPanel — immutable trail of admin mutations (fees, listings, KYC).
 */
import { useQuery } from "@tanstack/react-query";
import { shortenAddress, timeAgo, BRAND_NAV_ICONS } from "@xauconnect/utils";
import { Badge, GlassCard } from "@xauconnect/ui";
import { api } from "@/lib/api";
import { useAdminReady } from "@/lib/session";
import { AdminQueryShell } from "./admin-query-shell";
import { BrandGlyph } from "@/components/brand-glyph";

export function AuditLogPanel() {
  const adminReady = useAdminReady();
  const query = useQuery({
    queryKey: ["admin-audit"],
    enabled: adminReady,
    retry: 1,
    refetchInterval: 30_000,
    queryFn: () => api.adminAudit(),
  });

  return (
    <AdminQueryShell query={query} skeletonClass="h-72 w-full">
      {(data) => {
        const logs = data.logs ?? [];

        if (logs.length === 0) {
          return (
            <GlassCard className="flex items-center gap-3 py-10 text-sm text-ink-muted">
              <BrandGlyph src={BRAND_NAV_ICONS.audit} size={20} />
              No audit entries yet — every admin mutation (fee change, listing decision, KYC update)
              is recorded here.
            </GlassCard>
          );
        }

        return (
    <GlassCard variant="strong" padding="sm">
      <ul className="divide-y divide-white/50">
        {logs.map((log) => (
          <li key={log.id} className="flex items-center gap-3 px-2 py-3">
            <Badge tone="gold">{log.action}</Badge>
            <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">
              {log.resource ?? "—"}
            </span>
            <span className="font-mono text-xs text-ink-muted">
              {log.actor ? shortenAddress(log.actor.address) : "system"}
            </span>
            <span className="text-xs text-ink-faint">{timeAgo(log.createdAt)}</span>
          </li>
        ))}
      </ul>
    </GlassCard>
        );
      }}
    </AdminQueryShell>
  );
}

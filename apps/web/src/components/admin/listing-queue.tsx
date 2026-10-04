"use client";

/**
 * ListingQueue — approve/reject paid listing requests for the Discover page.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { getChainByKey, shortenAddress, timeAgo, BRAND_NAV_ICONS } from "@xauconnect/utils";
import { GlassButton, GlassCard, TokenIcon, toast } from "@xauconnect/ui";
import { api } from "@/lib/api";
import { useAdminReady } from "@/lib/session";
import { AdminQueryShell } from "./admin-query-shell";
import { BrandGlyph } from "@/components/brand-glyph";

export function ListingQueue() {
  const adminReady = useAdminReady();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["admin-listings"],
    enabled: adminReady,
    retry: 1,
    queryFn: () => api.adminListings(),
  });

  const decide = useMutation({
    mutationFn: ({ tokenId, decision }: { tokenId: string; decision: "approve" | "reject" }) =>
      api.adminDecideListing(tokenId, decision),
    onSuccess: (_d, vars) => {
      toast.success(`Listing ${vars.decision}d`);
      void queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
    },
    onError: (err) => toast.error("Decision failed", { description: (err as Error).message }),
  });

  return (
    <AdminQueryShell query={query} skeletonClass="h-64 w-full">
      {(data) => {
        const queue = data.queue ?? [];

        if (queue.length === 0) {
          return (
            <GlassCard className="flex items-center gap-3 py-10 text-sm text-ink-muted">
              <BrandGlyph src={BRAND_NAV_ICONS.admin} size={20} />
              The listing queue is empty. Paid listing requests land here for review.
            </GlassCard>
          );
        }

        return (
    <div className="grid gap-3 md:grid-cols-2">
      {queue.map((item) => {
        const chain = getChainByKey(item.chainKey);
        return (
          <GlassCard key={item.id} className="flex items-center gap-3">
            <TokenIcon symbol={item.symbol} size={40} />
            <span className="min-w-0 flex-1">
              <span className="block font-bold">
                {item.symbol} <span className="font-normal text-ink-muted">· {item.name}</span>
              </span>
              <span className="block text-xs text-ink-muted">
                {chain?.name ?? item.chainKey} · {shortenAddress(item.address)} · requested{" "}
                {timeAgo(item.createdAt)}
              </span>
            </span>
            <div className="flex gap-1.5">
              <GlassButton
                size="sm"
                disabled={decide.isPending}
                onClick={() => decide.mutate({ tokenId: item.id, decision: "approve" })}
              >
                <Check className="h-3.5 w-3.5" />
              </GlassButton>
              <GlassButton
                size="sm"
                variant="danger"
                disabled={decide.isPending}
                onClick={() => decide.mutate({ tokenId: item.id, decision: "reject" })}
              >
                <X className="h-3.5 w-3.5" />
              </GlassButton>
            </div>
          </GlassCard>
        );
      })}
    </div>
        );
      }}
    </AdminQueryShell>
  );
}

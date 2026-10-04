"use client";

/**
 * UsersTable — search, filter, delete, profile + social columns.
 */
import { useDeferredValue, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { timeAgo, BRAND_NAV_ICONS } from "@xauconnect/utils";
import { Badge, GlassButton, GlassCard, toast } from "@xauconnect/ui";
import { api } from "@/lib/api";
import { useAdminReady } from "@/lib/session";
import { AdminQueryShell } from "./admin-query-shell";
import { AdminFilterBar } from "./admin-filter-bar";
import { AdminUserIdentity, AdminSocialLinks } from "./admin-user-identity";
import { BrandGlyph } from "@/components/brand-glyph";

const KYC_TONE: Record<string, "success" | "danger" | "gold" | "neutral"> = {
  APPROVED: "success",
  REJECTED: "danger",
  PENDING: "gold",
  NONE: "neutral",
};

export function UsersTable() {
  const adminReady = useAdminReady();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [kycStatus, setKycStatus] = useState("");
  const [chainKind, setChainKind] = useState("");
  const deferredSearch = useDeferredValue(search.trim());

  const filters = {
    page,
    q: deferredSearch || undefined,
    role: role || undefined,
    kycStatus: kycStatus || undefined,
    chainKind: chainKind || undefined,
  };

  const query = useQuery({
    queryKey: ["admin-users", filters],
    enabled: adminReady,
    retry: 1,
    queryFn: () => api.adminUsers(filters),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.adminDeleteUser(id),
    onSuccess: () => {
      toast.success("User record removed");
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err) => toast.error("Delete failed", { description: (err as Error).message }),
  });

  const clearFilters = () => {
    setSearch("");
    setRole("");
    setKycStatus("");
    setChainKind("");
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-3">
      <AdminFilterBar
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        onClear={clearFilters}
        placeholder="Address, display name, Twitter, Telegram, Discord, website…"
      >
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
          className="glass h-9 rounded-xl px-3 text-xs font-semibold text-ink"
          aria-label="Filter by role"
        >
          <option value="">All roles</option>
          <option value="USER">User</option>
          <option value="ADMIN">Admin</option>
        </select>
        <select
          value={kycStatus}
          onChange={(e) => {
            setKycStatus(e.target.value);
            setPage(1);
          }}
          className="glass h-9 rounded-xl px-3 text-xs font-semibold text-ink"
          aria-label="Filter by KYC"
        >
          <option value="">All KYC</option>
          <option value="NONE">None</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <select
          value={chainKind}
          onChange={(e) => {
            setChainKind(e.target.value);
            setPage(1);
          }}
          className="glass h-9 rounded-xl px-3 text-xs font-semibold text-ink"
          aria-label="Filter by chain kind"
        >
          <option value="">All chain kinds</option>
          <option value="evm">EVM</option>
          <option value="solana">Solana</option>
        </select>
      </AdminFilterBar>

      <AdminQueryShell query={query} skeletonClass="h-72 w-full">
        {(data) => {
          const users = data.users ?? [];
          const total = data.total ?? 0;

          if (users.length === 0) {
            return (
              <GlassCard className="flex items-center gap-3 py-10 text-sm text-ink-muted">
                <BrandGlyph src={BRAND_NAV_ICONS.users} size={20} />
                No users match your filters.
              </GlassCard>
            );
          }

          return (
            <GlassCard variant="strong" padding="sm" className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-sm">
                <thead>
                  <tr className="border-b border-white/60 text-left text-[11px] uppercase tracking-wider text-ink-muted">
                    <th className="px-3 py-2.5 font-semibold">User</th>
                    <th className="px-3 py-2.5 font-semibold">Socials</th>
                    <th className="px-3 py-2.5 font-semibold">Role</th>
                    <th className="px-3 py-2.5 font-semibold">KYC</th>
                    <th className="px-3 py-2.5 font-semibold">Kind</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Joined</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Last seen</th>
                    <th className="px-3 py-2.5 text-right font-semibold"> </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-white/40 last:border-0">
                      <td className="px-3 py-3">
                        <AdminUserIdentity
                          address={user.address}
                          profile={user}
                          addressChars={8}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <AdminSocialLinks profile={user} />
                      </td>
                      <td className="px-3 py-3">
                        <Badge tone={user.role === "ADMIN" ? "gold" : "neutral"}>{user.role}</Badge>
                      </td>
                      <td className="px-3 py-3">
                        <Badge tone={KYC_TONE[user.kycStatus] ?? "neutral"}>{user.kycStatus}</Badge>
                      </td>
                      <td className="px-3 py-3 text-xs uppercase text-ink-muted">{user.chainKind}</td>
                      <td className="px-3 py-3 text-right text-ink-muted">{timeAgo(user.createdAt)}</td>
                      <td className="px-3 py-3 text-right text-ink-muted">{timeAgo(user.lastSeenAt)}</td>
                      <td className="px-3 py-3 text-right">
                        <GlassButton
                          size="sm"
                          variant="ghost"
                          disabled={remove.isPending}
                          aria-label="Delete user record"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Delete user ${user.displayName ?? user.address}? Connected wallet links will be cleared.`,
                              )
                            ) {
                              remove.mutate(user.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-danger" />
                        </GlassButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between px-3 py-2">
                <p className="text-xs text-ink-muted">{total.toLocaleString()} users</p>
                <div className="flex gap-2">
                  <GlassButton
                    size="sm"
                    variant="ghost"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Prev
                  </GlassButton>
                  <GlassButton
                    size="sm"
                    variant="ghost"
                    disabled={page * 50 >= total}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </GlassButton>
                </div>
              </div>
            </GlassCard>
          );
        }}
      </AdminQueryShell>
    </div>
  );
}

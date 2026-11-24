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
import { AdminFilter, AdminFilterBar } from "./admin-filter-bar";
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
        active={Boolean(search || role || kycStatus || chainKind)}
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        onClear={clearFilters}
        placeholder="Address, display name, Twitter, Telegram, Discord, website…"
      >
        <AdminFilter label="Role">
          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
            className="admin-control glass-field"
            aria-label="Filter by role"
          >
            <option value="">All roles</option>
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
          </select>
        </AdminFilter>
        <AdminFilter label="KYC status">
          <select
            value={kycStatus}
            onChange={(e) => {
              setKycStatus(e.target.value);
              setPage(1);
            }}
            className="admin-control glass-field"
            aria-label="Filter by KYC"
          >
            <option value="">All KYC</option>
            <option value="NONE">None</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </AdminFilter>
        <AdminFilter label="Wallet type">
          <select
            value={chainKind}
            onChange={(e) => {
              setChainKind(e.target.value);
              setPage(1);
            }}
            className="admin-control glass-field"
            aria-label="Filter by chain kind"
          >
            <option value="">All chain kinds</option>
            <option value="evm">EVM</option>
            <option value="solana">Solana</option>
          </select>
        </AdminFilter>
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
              <h2 className="admin-title px-3 pb-3">User directory</h2>
              <table className="admin-records" aria-label="User directory">
                <thead>
                  <tr>
                    {["Identity", "Access", "Activity", "Social profiles", "Actions"].map(
                      (label) => (
                        <th key={label} scope="col">
                          {label}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td data-label="Identity" data-wide="title">
                        <AdminUserIdentity address={user.address} profile={user} addressChars={8} />
                        <span className="mt-1 block text-xs uppercase text-ink-muted">
                          {user.chainKind}
                        </span>
                      </td>
                      <td data-label="Access">
                        <div className="flex flex-wrap gap-1">
                          <Badge tone={user.role === "ADMIN" ? "gold" : "neutral"}>
                            {user.role}
                          </Badge>
                          <Badge tone={KYC_TONE[user.kycStatus] ?? "neutral"}>
                            KYC: {user.kycStatus}
                          </Badge>
                        </div>
                      </td>
                      <td data-label="Activity">
                        <div className="text-xs text-ink-soft">
                          Last seen {timeAgo(user.lastSeenAt)}
                        </div>
                        <div className="mt-1 text-xs text-ink-muted">
                          Joined {timeAgo(user.createdAt)}
                        </div>
                      </td>
                      <td data-label="Social profiles">
                        <AdminSocialLinks profile={user} />
                      </td>
                      <td data-label="Actions">
                        {user.role !== "ADMIN" ? (
                          <GlassButton
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={remove.isPending}
                            aria-label="Delete user record"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Delete user ${user.displayName ?? user.address}? Connected wallet links will be cleared.`,
                                )
                              )
                                remove.mutate(user.id);
                            }}
                          >
                            <Trash2 size={15} className="text-danger" />
                            Remove
                          </GlassButton>
                        ) : (
                          <span className="text-xs text-ink-muted">Protected</span>
                        )}
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

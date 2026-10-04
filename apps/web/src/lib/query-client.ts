import type { QueryClient } from "@tanstack/react-query";

let appQueryClient: QueryClient | null = null;

export function registerAppQueryClient(client: QueryClient): void {
  appQueryClient = client;
}

function isAdminQueryKey(queryKey: readonly unknown[]): boolean {
  const head = queryKey[0];
  return typeof head === "string" && head.startsWith("admin-");
}

/** Drop cached admin queries so a soft logout cannot poison the next login. */
export function clearAdminQueries(): void {
  if (!appQueryClient) return;
  const predicate = (q: { queryKey: readonly unknown[] }) => isAdminQueryKey(q.queryKey);
  void appQueryClient.cancelQueries({ predicate });
  appQueryClient.removeQueries({ predicate });
}

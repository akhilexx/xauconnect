import Link from "next/link";
import { getChainByKey } from "@xauconnect/utils";
import { getAllSeoPages } from "@/lib/seo/pages";

/** The sitemap lists individual routes. Give each the same reachable path from its source network. */
export function ChainRouteDirectory({ from }: { from: string }) {
  const destinations = new Map<string, { path: string; label: string }[]>();
  for (const p of getAllSeoPages()) {
    if (p.kind !== "cross-chain-swap" || p.fromChainKey !== from || !p.toChainKey ||
        !p.pairSlug || p.noindex || (p.canonicalPath && p.canonicalPath !== p.path)) continue;
    const items = destinations.get(p.toChainKey) ?? [];
    const [input, output] = p.pairSlug.toUpperCase().split("-");
    items.push({ path: p.path, label: `${input} to ${output}` });
    destinations.set(p.toChainKey, items);
  }
  if (!destinations.size) return null;
  const name = getChainByKey(from)?.name ?? from;
  return (
    <section aria-labelledby="departing-routes" className="space-y-3">
      <h2 id="departing-routes" className="font-display text-xl font-bold text-ink">Cross-chain routes from {name}</h2>
      <p className="text-sm text-ink-muted">Choose the receiving network, then the assets. Check a live quote for availability and costs.</p>
      {[...destinations].sort(([a], [b]) => a.localeCompare(b)).map(([key, routes]) => (
        <details key={key} className="glass rounded-glass px-4">
          <summary className="cursor-pointer py-3 font-semibold text-ink">{name} to {getChainByKey(key)?.name ?? key} ({routes.length})</summary>
          <ul className="grid gap-2 pb-4 sm:grid-cols-2">
            {routes.sort((a, b) => a.label.localeCompare(b.label)).map(route => (
              <li key={route.path}><Link prefetch={false} href={route.path} className="text-sm text-gold-dark underline underline-offset-2">{route.label}</Link></li>
            ))}
          </ul>
        </details>
      ))}
    </section>
  );
}

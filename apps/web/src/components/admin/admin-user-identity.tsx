"use client";

import { ExternalLink } from "lucide-react";

export type AdminUserProfile = {
  displayName?: string | null;
  twitter?: string | null;
  telegram?: string | null;
  discord?: string | null;
  website?: string | null;
};

export function AdminUserIdentity({
  address,
  profile,
  addressChars = 6,
}: {
  address: string;
  profile?: AdminUserProfile | null;
  addressChars?: number;
}) {
  const name = profile?.displayName?.trim();
  const short =
    address.length > addressChars * 2 + 3
      ? `${address.slice(0, addressChars)}…${address.slice(-addressChars)}`
      : address;

  return (
    <div className="min-w-0">
      {name ? (
        <p className="truncate font-semibold text-ink">{name}</p>
      ) : null}
      <p className="truncate font-mono text-xs text-ink-muted" title={address}>
        {short}
      </p>
    </div>
  );
}

export function AdminSocialLinks({ profile }: { profile?: AdminUserProfile | null }) {
  if (!profile) return <span className="text-xs text-ink-muted">—</span>;

  const links: Array<{ label: string; href: string; text: string }> = [];
  if (profile.twitter) {
    const handle = profile.twitter.replace(/^@/, "");
    links.push({ label: "X", href: `https://x.com/${handle}`, text: `@${handle}` });
  }
  if (profile.telegram) {
    const handle = profile.telegram.replace(/^@/, "");
    links.push({ label: "TG", href: `https://t.me/${handle}`, text: `@${handle}` });
  }
  if (profile.discord) {
    links.push({ label: "DC", href: "#", text: profile.discord });
  }
  if (profile.website) {
    links.push({ label: "Web", href: profile.website, text: profile.website.replace(/^https?:\/\//, "") });
  }

  if (links.length === 0) {
    return <span className="text-xs text-ink-muted">No socials</span>;
  }

  return (
    <ul className="flex max-w-[14rem] flex-col gap-0.5 text-xs">
      {links.map((l) => (
        <li key={l.label} className="truncate">
          {l.href === "#" ? (
            <span className="text-ink-muted">{l.text}</span>
          ) : (
            <a
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-0.5 font-medium text-gold-deep hover:underline"
            >
              <span className="shrink-0 text-[10px] uppercase text-ink-muted">{l.label}</span>
              <span className="truncate">{l.text}</span>
              <ExternalLink className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

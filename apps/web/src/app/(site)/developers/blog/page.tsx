import Link from "next/link";
import { GlassCard } from "@xauconnect/ui";
import { DevDocsShell } from "@/components/developers/dev-docs-shell";
import { BLOG_POSTS, formatBlogDate } from "@/lib/developers/blog-posts";

export default function BlogIndexPage() {
  return (
    <DevDocsShell
      title="Developer blog"
      description="Guides for AI agents, autonomous bots, and programmatic swap integrations."
    >
      <ul className="space-y-4 not-prose">
        {BLOG_POSTS.map((p) => (
          <li key={p.slug}>
            <GlassCard variant="default" padding="md" className="transition-all hover:shadow-gold-glow/30">
              <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                <time dateTime={p.date}>{formatBlogDate(p.date)}</time>
                <span aria-hidden>·</span>
                <span>{p.readMinutes} min read</span>
              </div>
              <h2 className="font-display mt-2 text-lg font-bold">
                <Link
                  href={`/developers/blog/${p.slug}`}
                  className="text-ink transition-colors hover:text-gold-deep"
                >
                  {p.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{p.excerpt}</p>
              <Link
                href={`/developers/blog/${p.slug}`}
                className="mt-3 inline-block text-sm font-semibold text-gold-deep hover:underline"
              >
                Read article →
              </Link>
            </GlassCard>
          </li>
        ))}
      </ul>
    </DevDocsShell>
  );
}

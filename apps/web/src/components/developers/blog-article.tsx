import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { BlogPost } from "@/lib/developers/blog-posts";
import { formatBlogDate } from "@/lib/developers/blog-posts";

export function BlogArticle({ post }: { post: BlogPost }) {
  return (
    <div className="space-y-6">
      <Link
        href="/developers/blog"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted transition-colors hover:text-gold-deep"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        All posts
      </Link>

      <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
        <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
        <span aria-hidden>·</span>
        <span>{post.readMinutes} min read</span>
      </div>

      {post.sections.map((section, i) => (
        <section key={i} className="space-y-3">
          {section.heading ? (
            <h2 className="font-display text-xl font-bold text-ink">{section.heading}</h2>
          ) : null}
          {section.paragraphs?.map((p, j) => (
            <p key={j}>{p}</p>
          ))}
          {section.list ? (
            <ul className="ml-4 list-disc space-y-1.5">
              {section.list.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          ) : null}
          {section.code ? (
            <pre className="overflow-x-auto rounded-xl border border-white/60 bg-ink/[0.04] p-4 font-mono text-xs leading-relaxed text-ink">
              {section.code}
            </pre>
          ) : null}
        </section>
      ))}

      <div className="rounded-2xl border border-gold/25 bg-gold/[0.08] p-4">
        <p className="text-sm font-semibold text-ink">Ready to integrate?</p>
        <p className="mt-1 text-sm text-ink-muted">
          Follow the quickstart or explore the OpenAPI reference.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href="/developers/quickstart" className="text-sm font-semibold text-gold-deep hover:underline">
            Quickstart →
          </Link>
          <Link href="/developers/api" className="text-sm font-semibold text-gold-deep hover:underline">
            API reference →
          </Link>
        </div>
      </div>
    </div>
  );
}

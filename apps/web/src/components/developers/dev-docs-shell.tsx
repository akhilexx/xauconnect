import { GlassCard } from "@xauconnect/ui";
import { DevDocsNav } from "./dev-docs-nav";

export function DevDocsShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 lg:flex-row lg:gap-8">
      <aside className="lg:w-56 lg:shrink-0">
        <DevDocsNav />
      </aside>
      <article className="min-w-0 flex-1">
        <GlassCard variant="strong" padding="lg" className="space-y-6">
          <header className="border-b border-white/50 pb-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-gold-deep">
              Developers
            </p>
            <h1 className="font-display mt-2 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">{description}</p>
            ) : null}
          </header>
          <div className="prose-dev space-y-4 text-sm leading-relaxed text-ink-muted [&_a]:font-semibold [&_a]:text-gold-deep [&_a]:no-underline hover:[&_a]:underline [&_code]:rounded-md [&_code]:border [&_code]:border-white/50 [&_code]:bg-white/70 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:text-ink [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink [&_h3]:font-semibold [&_h3]:text-ink [&_li]:ml-4 [&_ol]:list-decimal [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-white/50 [&_pre]:bg-ink/[0.04] [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-xs [&_strong]:text-ink [&_ul]:list-disc">
            {children}
          </div>
        </GlassCard>
      </article>
    </div>
  );
}

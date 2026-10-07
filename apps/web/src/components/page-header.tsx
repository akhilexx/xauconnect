import type { ReactNode } from "react";
import { cn } from "@xauconnect/ui";

/** Consistent page titles — compact on phones, display-scale from sm up. */
export function PageHeader({
  children,
  description,
  className,
  citation = false,
}: {
  children: ReactNode;
  description?: string;
  className?: string;
  /** Marks the opening sentence for retrieval and AI overview citations. */
  citation?: boolean;
}) {
  return (
    <header className={cn("min-w-0", className)}>
      <h1 className="font-display text-[1.65rem] font-extrabold leading-[1.15] tracking-tight sm:text-3xl">
        {children}
      </h1>
      {description ? (
        <p
          id={citation ? "answer" : undefined}
          className={cn(
            "mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-muted",
            citation && "seo-citation",
          )}
        >
          {description}
        </p>
      ) : null}
    </header>
  );
}

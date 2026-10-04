import type { ReactNode } from "react";
import { cn } from "@xauconnect/ui";

/** Consistent page titles — compact on phones, display-scale from sm up. */
export function PageHeader({
  children,
  description,
  className,
}: {
  children: ReactNode;
  description?: string;
  className?: string;
}) {
  return (
    <header className={cn("min-w-0", className)}>
      <h1 className="font-display text-[1.65rem] font-extrabold leading-[1.15] tracking-tight sm:text-3xl">
        {children}
      </h1>
      {description ? (
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-muted">{description}</p>
      ) : null}
    </header>
  );
}

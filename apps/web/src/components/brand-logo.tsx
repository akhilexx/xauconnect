/**
 * BrandLogo — XAUConnect orbital mark + optional wordmark.
 * Uses static assets from /public/brand/.
 */
import { BRAND_LOGO, BRAND_NAME } from "@xauconnect/utils";
import { cn } from "@xauconnect/ui";

export interface BrandMarkProps {
  size?: number;
  className?: string;
  /** LCP-critical placements (navbar). */
  priority?: boolean;
}

/** Logo mark only — favicon-style orbital rings. */
export function BrandMark({ size = 36, className, priority }: BrandMarkProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- local brand asset; next/image not required
    <img
      src={BRAND_LOGO.src}
      alt={`${BRAND_NAME} logo`}
      width={size}
      height={size}
      className={cn("shrink-0 overflow-visible object-contain", className)}
      {...(priority ? { fetchPriority: "high" as const } : {})}
    />
  );
}

export interface BrandWordmarkProps {
  logoSize?: number;
  showLogo?: boolean;
  className?: string;
  wordmarkClassName?: string;
  priority?: boolean;
}

/** Logo + XAUConnect wordmark — footer, auth screens, empty states. */
export function BrandWordmark({
  logoSize = 40,
  showLogo = true,
  className,
  wordmarkClassName,
  priority,
}: BrandWordmarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {showLogo && <BrandMark size={logoSize} priority={priority} />}
      <span
        className={cn(
          "font-display text-xl font-extrabold tracking-tight",
          wordmarkClassName,
        )}
      >
        XAU<span className="gold-text">Connect</span>
      </span>
    </span>
  );
}

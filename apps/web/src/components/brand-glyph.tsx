import { cn } from "@xauconnect/ui";

/** Clay 3D brand mark for nav, tabs, and metric tiles. */
export function BrandGlyph({
  src,
  size = 20,
  className,
}: {
  src: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center overflow-visible", className)}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- local brand asset */}
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        className="h-full w-full object-contain object-center"
      />
    </span>
  );
}

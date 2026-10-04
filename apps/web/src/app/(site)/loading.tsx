import { BrandMark } from "@/components/brand-logo";
import { Skeleton } from "@xauconnect/ui";

/** Route-level loading state with brand mark. */
export default function Loading() {
  return (
    <div className="flex w-full flex-col gap-4 pt-4">
      <div className="flex items-center gap-3 pb-2">
        <BrandMark size={32} className="rounded-lg opacity-80" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <Skeleton className="h-72 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

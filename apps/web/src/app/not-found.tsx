import Link from "next/link";
import { GlassButton, GlassCard } from "@xauconnect/ui";
import { BrandMark } from "@/components/brand-logo";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <GlassCard variant="strong" padding="lg" className="max-w-md text-center">
        <BrandMark size={56} className="mx-auto rounded-xl" />
        <h1 className="mt-4 font-display text-4xl font-extrabold">404</h1>
        <p className="mt-2 text-sm text-ink-muted">
          This page drifted off-chain. Let&apos;s get you back to the gold.
        </p>
        <Link href="/" className="mt-5 inline-block">
          <GlassButton>Back home</GlassButton>
        </Link>
      </GlassCard>
    </div>
  );
}

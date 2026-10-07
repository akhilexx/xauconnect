import Link from "next/link";
import { LaunchWizard } from "@/components/launchpad/launch-wizard";
import { RecentLaunches } from "@/components/launchpad/recent-launches";
import { PageHeader } from "@/components/page-header";

const HOME_LEAD =
  "Launch a token on Meteora with XAUConnect’s Gold Curve — Fair, Shield, or Distribute — and traders can buy it immediately on Solana. At exactly 10 SOL or 750 USDC the pool graduates into a locked DAMM v2 market.";

const LAUNCHPAD_LEAD =
  "Launch a Gold Curve on Meteora with XAUConnect — Fair, Shield, or Distribute — and traders can buy your token immediately on Solana. At exactly 10 SOL or 750 USDC the pool graduates into a locked DAMM v2 market.";

/** Shared launchpad landing. Home and /launchpad use different queries so each H1 matches its title. */
export function LaunchpadScreen({ variant = "launchpad" }: { variant?: "home" | "launchpad" }) {
  const home = variant === "home";
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div className="flex min-w-0 w-full flex-col gap-6">
        <PageHeader citation description={home ? HOME_LEAD : LAUNCHPAD_LEAD}>
          {home ? (
            <>
              Launch a token on <span className="gold-text">Meteora</span>
            </>
          ) : (
            <>
              Launch a Gold Curve on <span className="gold-text">Meteora</span>
            </>
          )}
        </PageHeader>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">
          Read{" "}
          <Link href="/learn/guides/how-to-launch-a-token-on-xauconnect" className="font-semibold text-gold-dark underline decoration-gold/40 underline-offset-2">
            how to launch a token on XAUConnect
          </Link>{" "}
          before you deploy, then compare a test buy on the{" "}
          <Link href="/swap" className="font-semibold text-gold-dark underline decoration-gold/40 underline-offset-2">
            swap
          </Link>{" "}
          page.
        </p>
        <LaunchWizard />
      </div>
      <RecentLaunches />
    </div>
  );
}

import { LaunchWizard } from "@/components/launchpad/launch-wizard";
import { RecentLaunches } from "@/components/launchpad/recent-launches";
import { PageHeader } from "@/components/page-header";

/** Shared launchpad landing — home and /launchpad render the same screen. */
export function LaunchpadScreen() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div className="flex min-w-0 w-full flex-col gap-6">
        <PageHeader description="Create a token on Meteora’s Dynamic Bonding Curve. Pick Fair, Shield, or Distribute. Traders can buy immediately. At exactly 10 SOL or 750 USDC the pool graduates into a locked DAMM v2 market.">
          Launch on <span className="gold-text">Meteora</span>
        </PageHeader>
        <LaunchWizard />
      </div>
      <RecentLaunches />
    </div>
  );
}

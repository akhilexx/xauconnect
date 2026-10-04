import { XauToaster } from "@xauconnect/ui";
import { Providers } from "@/components/providers";
import { AppFlowBackground } from "@/components/app-flow-background";
import { SiteShell } from "@/components/site-shell";

/** Interactive app shell — wallet providers, animated background, client navbar. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <AppFlowBackground />
      <SiteShell>{children}</SiteShell>
      <XauToaster />
    </Providers>
  );
}

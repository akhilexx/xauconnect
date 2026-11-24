import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { MobileTabBar } from "@/components/mobile-tab-bar";

/** All internal destinations keep the same header, footer and mobile navigation. */
export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-[1] flex min-h-dvh flex-col max-md:pb-[calc(4.85rem+env(safe-area-inset-bottom))]">
      <Navbar />
      <main className="w-full min-w-0 min-h-[calc(100dvh-7rem)] flex-1 overflow-x-clip px-4 pb-6 pt-3 sm:px-6 sm:pb-10 sm:pt-6 lg:px-8">
        {children}
      </main>
      <Footer />
      <MobileTabBar />
    </div>
  );
}

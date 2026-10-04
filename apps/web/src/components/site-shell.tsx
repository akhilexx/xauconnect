"use client";

import { usePathname } from "next/navigation";
import { cn } from "@xauconnect/ui";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { MobileTabBar } from "@/components/mobile-tab-bar";

/** App chrome — docks the mobile tab bar and keeps admin full-bleed. */
export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideDock = pathname.startsWith("/xaxmd5");

  return (
    <div
      className={cn(
        "relative z-[1] flex min-h-dvh flex-col",
        !hideDock && "max-md:pb-[calc(4.85rem+env(safe-area-inset-bottom))]",
      )}
    >
      <Navbar />
      <main className="w-full min-w-0 min-h-[calc(100dvh-7rem)] flex-1 overflow-x-clip px-4 pb-6 pt-3 sm:px-6 sm:pb-10 sm:pt-6 lg:px-8">
        {children}
      </main>
      <Footer />
      {hideDock ? null : <MobileTabBar />}
    </div>
  );
}

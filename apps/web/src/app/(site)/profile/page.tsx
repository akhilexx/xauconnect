import type { Metadata } from "next";
import { ProfilePanel } from "@/components/profile/profile-panel";
import { GoldCurveClaims } from "@/components/profile/gold-curve-claims";
import { PageHeader } from "@/components/page-header";
import { sitePageMetadata } from "@/lib/seo/site-metadata";

export const metadata: Metadata = sitePageMetadata({
  title: "My Profile",
  description: "Connect your socials and personalize your XAUConnect identity.",
  path: "/profile",
});

export default function ProfilePage() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 sm:gap-6">
      <PageHeader description="Connect your socials so the community can find you across launches and pools.">
        Your <span className="gold-text">profile</span>
      </PageHeader>
      <ProfilePanel />
      <GoldCurveClaims />
    </div>
  );
}

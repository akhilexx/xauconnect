import { BRAND_NAV_ICONS } from "@xauconnect/utils";
import { ADMIN_CONSOLE_PATH } from "@/lib/admin-path";

export type SiteNavItem = {
  href: string;
  label: string;
  mark: string;
};

/** Desktop header destinations. Launchpad leads — it is the home of the app. */
export const DESKTOP_NAV: SiteNavItem[] = [
  { href: "/launchpad", label: "Launchpad", mark: BRAND_NAV_ICONS.launchpad },
  { href: "/swap", label: "Swap", mark: BRAND_NAV_ICONS.swap },
  { href: "/buy-crypto", label: "Buy/Sell", mark: BRAND_NAV_ICONS.buySell },
  { href: "/liquidity", label: "Liquidity", mark: BRAND_NAV_ICONS.liquidity },
  { href: "/discover", label: "Discover", mark: BRAND_NAV_ICONS.discover },
  { href: "/learn", label: "Learn", mark: BRAND_NAV_ICONS.learn },
  { href: "/wallet", label: "Wallet", mark: BRAND_NAV_ICONS.wallet },
];

/** Primary mobile dock — five thumbs, no overflow. Launch is the first tab. */
export const MOBILE_TABS: SiteNavItem[] = [
  { href: "/launchpad", label: "Launch", mark: BRAND_NAV_ICONS.launchpad },
  { href: "/swap", label: "Swap", mark: BRAND_NAV_ICONS.swap },
  { href: "/discover", label: "Discover", mark: BRAND_NAV_ICONS.discover },
  { href: "/wallet", label: "Wallet", mark: BRAND_NAV_ICONS.wallet },
];

export const MORE_NAV: SiteNavItem[] = [
  { href: "/buy-crypto", label: "Buy / Sell", mark: BRAND_NAV_ICONS.buySell },
  { href: "/liquidity", label: "Liquidity", mark: BRAND_NAV_ICONS.liquidity },
  { href: "/learn", label: "Learn", mark: BRAND_NAV_ICONS.learn },
  { href: "/profile", label: "Profile", mark: BRAND_NAV_ICONS.profile },
  { href: "/developers", label: "Developers", mark: BRAND_NAV_ICONS.simulation },
];

export const PROFILE_NAV: SiteNavItem = {
  href: "/profile",
  label: "Profile",
  mark: BRAND_NAV_ICONS.profile,
};

export const ADMIN_NAV: SiteNavItem = {
  href: ADMIN_CONSOLE_PATH,
  label: "Admin",
  mark: BRAND_NAV_ICONS.admin,
};

export function isTabActive(pathname: string, href: string): boolean {
  if (href === "/launchpad") {
    return pathname === "/" || pathname === "/launchpad" || pathname.startsWith("/launchpad/");
  }
  if (href === "/discover") {
    return pathname.startsWith("/discover") || pathname.startsWith("/token/");
  }
  if (href === "/swap") {
    return pathname.startsWith("/swap");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isMoreActive(pathname: string): boolean {
  return (
    pathname.startsWith("/buy-crypto") ||
    pathname.startsWith("/sell-crypto") ||
    pathname.startsWith("/liquidity") ||
    pathname.startsWith("/learn") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/developers") ||
    pathname.startsWith("/about") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/privacy")
  );
}

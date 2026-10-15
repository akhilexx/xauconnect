import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * 410 Gone for URLs that should leave the index.
 * A 404 leaves more of those URLs indexed. Same-ticker bridges and synthetic
 * TK* doorways have no replacement page.
 */
const DEAD_EXACT = new Set([
  "/prop-firm-comparison-2026",
  "/learn/impermanent-loss-on-bnb-chain",
  "/learn/cross-chain-bridge-on-ethereum",
]);

function isGone(pathname: string): boolean {
  if (DEAD_EXACT.has(pathname)) return true;
  if (/\/tk\d+/i.test(pathname)) return true;
  const same = pathname.match(/^\/cross-chain\/[^/]+\/[^/]+\/([a-z0-9]+)-\1$/);
  return Boolean(same);
}

export function middleware(request: NextRequest) {
  if (!isGone(request.nextUrl.pathname)) return NextResponse.next();
  return new NextResponse("Gone", {
    status: 410,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "x-robots-tag": "noindex",
    },
  });
}

export const config = {
  matcher: ["/cross-chain/:path*", "/learn/:path*", "/prop-firm-comparison-2026", "/swap/:path*", "/meme-coins/:path*"],
};

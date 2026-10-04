/**
 * API + WS client singletons for the web app.
 *
 * URL resolution (production-safe by default):
 *   1. NEXT_PUBLIC_API_URL / NEXT_PUBLIC_WS_URL env overrides (baked at build)
 *   2. In the browser: same-origin "/api" and "/ws" — the production reverse
 *      proxy (Caddy on the VM) and the Next dev rewrite both route these to
 *      the backend. Same-origin avoids CORS, mixed-content blocking, and
 *      hard-coded IPs behind custom domains.
 *   3. SSR/build fallback: localhost backend.
 */
import { XauApiClient, XauWsClient } from "@xauconnect/sdk";

function resolveApiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") return `${window.location.origin}/api`;
  return "http://localhost:4000";
}

function resolveWsUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${window.location.host}/ws`;
  }
  return "ws://localhost:4000/ws";
}

export const API_URL = resolveApiUrl();
export const WS_URL = resolveWsUrl();

export const api = new XauApiClient({
  baseUrl: API_URL,
  clientSource: "web",
  clientName: "xauconnect-web",
});

let ws: XauWsClient | null = null;

/** Lazy WS singleton (browser only). */
export function getWs(): XauWsClient {
  if (!ws) {
    ws = new XauWsClient(WS_URL);
    ws.connect();
  }
  return ws;
}

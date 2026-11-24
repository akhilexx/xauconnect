import { XauApiError } from "@xauconnect/sdk";
import type { SwapTx } from "@xauconnect/utils";
import { api } from "./api";

const prefix = "xau:unreported:";
type Submission = { buildId: string; chainKey: string; txHash: string; at: number };
const inFlight = new Set<string>();
async function deliver(s: Submission) {
  if (inFlight.has(s.buildId)) return;
  inFlight.add(s.buildId);
  try {
    if (Date.now() - s.at < 86400000)
      await api.recordSwap({ buildId: s.buildId, chainKey: s.chainKey, txHash: s.txHash });
  } catch (e) {
    if (!(e instanceof XauApiError) || ![400, 409, 422].includes(e.status)) return;
  } finally {
    inFlight.delete(s.buildId);
  }
  try {
    localStorage.removeItem(prefix + s.buildId);
  } catch {
    /* private browsing */
  }
}
export function reportSubmission(built: SwapTx, txHash: string) {
  if (!built.buildId) return;
  const submission = { buildId: built.buildId, chainKey: built.chainKey, txHash, at: Date.now() };
  try {
    localStorage.setItem(prefix + built.buildId, JSON.stringify(submission));
  } catch {
    /* still send immediately */
  }
  void deliver(submission);
}
export function retrySubmissions() {
  try {
    for (const k of Object.keys(localStorage)
      .filter((k) => k.startsWith(prefix))
      .slice(0, 50)) {
      try {
        const s = JSON.parse(localStorage.getItem(k) ?? "null") as Submission;
        if (s && prefix + s.buildId === k && typeof s.at === "number") void deliver(s);
        else localStorage.removeItem(k);
      } catch {
        localStorage.removeItem(k);
      }
    }
  } catch {
    /* storage unavailable */
  }
}

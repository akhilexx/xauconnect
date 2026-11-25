import { logger } from "../logger.js";

/** Skip overlapping ticks and report failures without terminating the API. */
export function backgroundTask(name: string, run: () => Promise<unknown>): () => void {
  let running = false;
  return () => {
    if (running) return;
    running = true;
    void Promise.resolve()
      .then(run)
      .catch((error: unknown) => {
        const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
        logger.warn({ task: name, code }, "background task failed; next tick will retry");
      })
      .finally(() => {
        running = false;
      });
  };
}

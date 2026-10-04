/**
 * Lightweight health HTTP server for the indexer worker (:4100/health).
 */
import http from "node:http";
import { logger } from "../logger.js";

let lastHeartbeat = Date.now();

export function heartbeat(): void {
  lastHeartbeat = Date.now();
}

export function startHealthServer(port = 4100): http.Server {
  const server = http.createServer((req, res) => {
    if (req.url === "/health") {
      const stale = Date.now() - lastHeartbeat > 120_000;
      res.writeHead(stale ? 503 : 200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: !stale, lastHeartbeat }));
      return;
    }
    res.writeHead(404);
    res.end();
  });
  server.listen(port, () => logger.info({ port }, "indexer health listening"));
  return server;
}

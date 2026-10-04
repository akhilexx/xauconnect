/**
 * WebSocket hub — real-time prices, swap events, trending updates, launches.
 * All feeds use live data (DexScreener + DB); no synthetic/demo payloads.
 */
import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import {
  WsClientMessageSchema,
  type MarketToken,
  type WsChannel,
  type WsServerMessage,
} from "@xauconnect/utils";
import { logger } from "../logger.js";
import { db } from "../db/client.js";
import { getLiveLaunches } from "../services/launches.js";
import { tickerPrices, discovery } from "../services/market.js";
import { tokenCacheKey } from "../services/token-address.js";

type Channel = WsChannel;

interface ClientState {
  socket: WebSocket;
  channels: Set<Channel>;
  alive: boolean;
}

const clients = new Set<ClientState>();
let timers: NodeJS.Timeout[] = [];

let recentLaunches: MarketToken[] = [];

function launchKey(t: MarketToken): string {
  return tokenCacheKey(t.chainKey, t.address);
}

function sendToClient(client: ClientState, message: WsServerMessage): void {
  if (client.socket.readyState === WebSocket.OPEN) {
    client.socket.send(JSON.stringify(message));
  }
}

function broadcast(channel: Channel, payload: unknown) {
  const message: WsServerMessage = { type: channel, payload, ts: Date.now() };
  const encoded = JSON.stringify(message);
  for (const client of clients) {
    if (client.channels.has(channel) && client.socket.readyState === WebSocket.OPEN) {
      client.socket.send(encoded);
    }
  }
}

export function publishLaunch(token: MarketToken): void {
  const key = launchKey(token);
  const idx = recentLaunches.findIndex((t) => launchKey(t) === key);
  if (idx >= 0) {
    recentLaunches[idx] = token;
  } else {
    recentLaunches.unshift(token);
  }
  if (recentLaunches.length > 24) recentLaunches = recentLaunches.slice(0, 24);
  broadcast("launches", token);
}

export function getRecentLaunches(): MarketToken[] {
  return recentLaunches;
}

function sendLaunchesSnapshot(client: ClientState): void {
  sendToClient(client, { type: "launches", payload: recentLaunches, ts: Date.now() });
}

async function refreshLaunchBuffer(): Promise<void> {
  try {
    const { launches: live } = await getLiveLaunches();
    if (live.length === 0) return;
    recentLaunches = live;
    broadcast("launches", live);
  } catch (err) {
    logger.debug({ err: (err as Error).message }, "launch refresh failed");
  }
}

export function attachWebSocket(server: Server): void {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (socket) => {
    const state: ClientState = { socket, channels: new Set(["prices"]), alive: true };
    clients.add(state);

    socket.on("pong", () => (state.alive = true));
    socket.on("message", (raw) => {
      try {
        const parsed = WsClientMessageSchema.safeParse(JSON.parse(raw.toString()));
        if (!parsed.success) return;
        const msg = parsed.data;
        if (msg.type === "subscribe") {
          state.channels.add(msg.channel);
          if (msg.channel === "launches" && recentLaunches.length > 0) {
            sendLaunchesSnapshot(state);
          }
        }
        if (msg.type === "unsubscribe") state.channels.delete(msg.channel);
        if (msg.type === "ping") {
          socket.send(JSON.stringify({ type: "pong", ts: Date.now() } satisfies WsServerMessage));
        }
      } catch {
        // ignore malformed frames
      }
    });
    socket.on("close", () => clients.delete(state));
    socket.on("error", () => clients.delete(state));
  });

  timers.push(
    setInterval(() => {
      for (const client of clients) {
        if (!client.alive) {
          client.socket.terminate();
          clients.delete(client);
          continue;
        }
        client.alive = false;
        client.socket.ping();
      }
    }, 30_000),
  );

  timers.push(
    setInterval(async () => {
      try {
        const prices = await tickerPrices();
        if (prices.length > 0) broadcast("prices", prices);
      } catch (err) {
        logger.debug({ err: (err as Error).message }, "price tick failed");
      }
    }, 12_000),
  );

  timers.push(
    setInterval(async () => {
      if (!db) return;
      try {
        const swap = await db.swap.findFirst({
          orderBy: { createdAt: "desc" },
          select: {
            chainKey: true,
            tokenIn: true,
            volumeUsd: true,
            txHash: true,
            createdAt: true,
          },
        });
        if (swap) {
          broadcast("swaps", {
            chainKey: swap.chainKey,
            symbol: swap.tokenIn.slice(0, 6),
            side: "swap",
            amountUsd: Math.round(swap.volumeUsd),
            txHash: swap.txHash,
            timestamp: swap.createdAt.getTime(),
          });
        }
      } catch {
        /* next tick */
      }
    }, 2_500),
  );

  timers.push(
    setInterval(async () => {
      try {
        const tokens = await discovery("trending");
        if (tokens.length > 0) broadcast("trending", tokens);
      } catch {
        /* next tick */
      }
    }, 10_000),
  );

  timers.push(setInterval(() => void refreshLaunchBuffer(), 2_000));

  void (async () => {
    await refreshLaunchBuffer();
  })();

  logger.info("websocket hub attached at /ws");
}

export function stopWebSocket(): void {
  timers.forEach(clearInterval);
  timers = [];
  for (const client of clients) client.socket.close();
  clients.clear();
}

/**
 * XauWsClient — WebSocket client with auto-reconnect for live prices,
 * swap events, trending updates and the live launch feed.
 * Browser + React Native compatible.
 */
import type { WsChannel, WsServerMessage } from "@xauconnect/utils";

type Channel = WsChannel;
type Listener = (payload: unknown, ts: number) => void;

export class XauWsClient {
  private socket: WebSocket | null = null;
  private listeners = new Map<Channel, Set<Listener>>();
  private reconnectDelay = 1_000;
  private closedByUser = false;

  constructor(private url: string) {}

  connect(): void {
    this.closedByUser = false;
    this.open();
  }

  private open(): void {
    try {
      this.socket = new WebSocket(this.url);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.socket.onopen = () => {
      this.reconnectDelay = 1_000;
      // Re-subscribe to every channel that has listeners.
      for (const channel of this.listeners.keys()) {
        this.socket?.send(JSON.stringify({ type: "subscribe", channel }));
      }
    };

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(String(event.data)) as WsServerMessage;
        if (message.type === "pong") return;
        const set = this.listeners.get(message.type as Channel);
        set?.forEach((listener) => listener(message.payload, message.ts));
      } catch {
        // ignore malformed frames
      }
    };

    this.socket.onclose = () => {
      if (!this.closedByUser) this.scheduleReconnect();
    };
    this.socket.onerror = () => {
      this.socket?.close();
    };
  }

  private scheduleReconnect(): void {
    setTimeout(() => this.open(), this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 15_000);
  }

  subscribe(channel: Channel, listener: Listener): () => void {
    let set = this.listeners.get(channel);
    if (!set) {
      set = new Set();
      this.listeners.set(channel, set);
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: "subscribe", channel }));
      }
    }
    set.add(listener);

    return () => {
      set?.delete(listener);
      if (set && set.size === 0) {
        this.listeners.delete(channel);
        if (this.socket?.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({ type: "unsubscribe", channel }));
        }
      }
    };
  }

  close(): void {
    this.closedByUser = true;
    this.socket?.close();
    this.socket = null;
  }
}

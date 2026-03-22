import type { WebSocket } from "@fastify/websocket";

type WsClient = WebSocket;

class WebSocketServiceClass {
  private clients: Set<WsClient> = new Set();

  addClient(socket: WsClient): void {
    this.clients.add(socket);
    console.log(`[WS] Client connected. Total: ${this.clients.size}`);
  }

  removeClient(socket: WsClient): void {
    this.clients.delete(socket);
    console.log(`[WS] Client disconnected. Total: ${this.clients.size}`);
  }

  broadcast(eventType: string, data: Record<string, unknown>): void {
    if (this.clients.size === 0) return;

    const message = JSON.stringify({
      type: eventType,
      data,
      timestamp: Date.now(),
    });

    let sent = 0;
    let dead = 0;

    for (const client of this.clients) {
      if (client.readyState === 1 /* OPEN */) {
        try {
          client.send(message);
          sent++;
        } catch (err) {
          this.clients.delete(client);
          dead++;
        }
      } else {
        this.clients.delete(client);
        dead++;
      }
    }

    if (dead > 0) {
      console.log(`[WS] Broadcast: sent=${sent} removed_dead=${dead}`);
    }
  }

  get clientCount(): number {
    return this.clients.size;
  }
}

export const WebSocketService = new WebSocketServiceClass();

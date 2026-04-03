import type { FastifyInstance } from "fastify";
import { WebSocketService } from "../services/websocket.service.js";

export async function liveRoutes(app: FastifyInstance): Promise<void> {
  app.get("/live", { websocket: true }, (socket, _req) => {
    WebSocketService.addClient(socket);

    socket.send(
      JSON.stringify({
        type: "connected",
        data: { message: "Ball Sort live feed connected" },
        timestamp: Date.now(),
      })
    );

    // Clean up on disconnect so dead sockets don't linger in the set
    socket.on("close", () => WebSocketService.removeClient(socket));
  });
}
import Fastify from "fastify";
import type { FastifyError } from "fastify";
import { registerCors } from "./plugins/cors.js";
import { registerRateLimit } from "./plugins/rateLimit.js";
import { registerWebSocket } from "./plugins/websocket.js";
import { registerRoutes } from "./routes/index.js";
import { env } from "./config/env.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug",
      ...(env.NODE_ENV !== "production"
        ? { transport: { target: "pino-pretty", options: { colorize: true } } }
        : {}),
    },
  });


  await registerCors(app);
  await registerRateLimit(app);
  await registerWebSocket(app);


  await registerRoutes(app);


  app.setErrorHandler((error: FastifyError, _req, reply) => {
    app.log.error(error);
    reply.status(error.statusCode ?? 500).send({
      success: false,
      error: error.message ?? "Internal server error.",
    });
  });

  app.setNotFoundHandler((_req, reply) => {
    reply.status(404).send({ success: false, error: "Route not found." });
  });

  return app;
}

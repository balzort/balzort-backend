import type { FastifyInstance } from "fastify";
import { WebhookController } from "../controllers/webhook.controller.js";
import { verifyHelius } from "../middleware/helius.middleware.js";

export async function webhookRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/webhooks/helius",
    { preHandler: [verifyHelius] },
    WebhookController.handleHelius
  );
}
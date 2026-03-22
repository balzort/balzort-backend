import type { FastifyRequest, FastifyReply } from "fastify";
import { routeEvent } from "../indexer/eventRouter.js";
import { handleApiError } from "../utils/errorHandler.js";

export class WebhookController {
  /**
   * POST /webhooks/helius
   * Receives an array of enhanced transactions from Helius.
   * Routes each event to the appropriate handler.
   */
  static async handleHelius(req: FastifyRequest, reply: FastifyReply) {
    try {
      const events = req.body as any[];

      // Webhooks are deprecated in favor of our native TransactionIndexer
      // Just return 200 OK so Helius stops retrying
      return reply.status(200).send({ received: events.length, status: "deprecated" });
    } catch (error) {
      return handleApiError(reply, error, "WebhookController.handleHeliusEvent");
    }
  }
}

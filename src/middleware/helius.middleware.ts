import type { FastifyRequest, FastifyReply } from "fastify";
import { env } from "../config/env.js";
import { sendUnauthorized } from "../utils/response.js";

/**
 * Verifies that an incoming webhook request is from Helius.
 * Helius sends the secret as an Authorization header.
 */
export async function heliusMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || authHeader !== env.HELIUS_WEBHOOK_SECRET) {
    sendUnauthorized(reply, "Invalid webhook secret.");
    return;
  }
}

/** Alias so routes can import { verifyHelius } */
export const verifyHelius = heliusMiddleware;

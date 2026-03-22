import type { FastifyReply } from "fastify";

export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
}

/**
 * Central error handler for all controllers.
 * Logs the error and sends a consistent JSON response.
 */
export function handleApiError(
  reply: FastifyReply,
  error: unknown,
  context: string
): FastifyReply {
  const err = error as ApiError & Error;

  console.error(`[ERROR] ${context}:`, err?.message ?? err);


  if (err?.message?.includes("invalid token") || err?.message?.includes("expired")) {
    return reply.status(401).send({ error: "Unauthorized — invalid or expired token." });
  }


  if (err?.code === "23505") {
    return reply.status(409).send({ error: "Resource already exists." });
  }


  if (err?.code === "PGRST116") {
    return reply.status(404).send({ error: "Resource not found." });
  }


  if (err?.statusCode) {
    return reply.status(err.statusCode).send({ error: err.message });
  }


  return reply.status(500).send({
    error: "Internal server error.",
    detail: process.env.NODE_ENV === "development" ? err?.message : undefined,
  });
}

/**
 * Creates a typed API error with an optional HTTP status.
 */
export function createError(message: string, statusCode = 400): ApiError & Error {
  const err = new Error(message) as ApiError & Error;
  err.statusCode = statusCode;
  return err;
}

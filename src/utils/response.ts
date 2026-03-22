import type { FastifyReply } from "fastify";

export function sendSuccess<T>(
  reply: FastifyReply,
  data: T,
  statusCode = 200
): FastifyReply {
  return reply.status(statusCode).send({
    success: true,
    data,
  });
}

export function sendCreated<T>(reply: FastifyReply, data: T): FastifyReply {
  return sendSuccess(reply, data, 201);
}

export function sendError(
  reply: FastifyReply,
  message: string,
  statusCode = 400
): FastifyReply {
  return reply.status(statusCode).send({
    success: false,
    error: message,
  });
}

export function sendNotFound(reply: FastifyReply, resource = "Resource"): FastifyReply {
  return sendError(reply, `${resource} not found.`, 404);
}

export function sendUnauthorized(reply: FastifyReply, message = "Unauthorized."): FastifyReply {
  return sendError(reply, message, 401);
}

export function sendForbidden(reply: FastifyReply, message = "Forbidden."): FastifyReply {
  return sendError(reply, message, 403);
}

export function sendPaginated<T>(
  reply: FastifyReply,
  data: T[],
  total: number,
  page: number,
  limit: number
): FastifyReply {
  return reply.status(200).send({
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
}

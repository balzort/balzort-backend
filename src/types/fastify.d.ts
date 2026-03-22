import type { AuthUser } from "../middleware/auth.middleware.js";

declare module "fastify" {
  interface FastifyRequest {
    user: AuthUser;
  }
}

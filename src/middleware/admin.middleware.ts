import type { FastifyRequest, FastifyReply } from "fastify";
import { adminWallets } from "../config/env.js";
import { sendForbidden } from "../utils/response.js";
import type { AuthUser } from "./auth.middleware.js";
import { getPrimaryWallet } from "./auth.middleware.js";

/**
 * Must be used after authMiddleware.
 * Rejects the request if the authenticated user's wallet is not in ADMIN_WALLETS.
 */
export async function adminMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const user = (request as any).user as AuthUser | undefined;

  if (!user) {
    sendForbidden(reply, "Authentication required.");
    return;
  }

  const wallet = getPrimaryWallet(user);

  if (!wallet || !adminWallets.includes(wallet)) {
    sendForbidden(reply, "Admin access required.");
    return;
  }
}

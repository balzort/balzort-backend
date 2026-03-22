import type { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from "fastify";
import { verifyAccessToken, privy } from "../config/privyClient.js";
import { env } from "../config/env.js";
import { sendUnauthorized } from "../utils/response.js";

export interface AuthUser {
  privyUserId: string;
  embeddedWallet: string | null;
  externalWallet: string | null;
  email: string | null;
  authMethod: "wallet" | "google" | "email";
}

/**
 * Privy JWT auth middleware.
 * Reads Bearer token from Authorization header.
 * Verifies using @privy-io/node verifyAccessToken (exact pattern from uploaded reference).
 * Attaches req.user for downstream handlers.
 */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    sendUnauthorized(reply, "Missing Authorization header.");
    return;
  }

  const token = authHeader.replace("Bearer ", "").trim();

  try {
    // Step 1: Verify the token — same as uploaded users_controller.ts
    const verifiedClaims = await verifyAccessToken({
      access_token: token,
      app_id: env.PRIVY_APP_ID,
      verification_key: env.PRIVY_VERIFICATION_KEY,
    });

    // Step 2: Fetch the full Privy user — same pattern as uploaded reference
    const privyUser = await privy.users()._get(verifiedClaims.user_id);

    // Step 3: Separate wallet types — mirrors uploaded users_controller.ts exactly
    const embeddedWalletObj = privyUser.linked_accounts?.find(
      (acc: any) => acc.type === "wallet" && acc.wallet_client_type === "privy"
    );

    const externalWalletObj = privyUser.linked_accounts?.find(
      (acc: any) => acc.type === "wallet" && acc.wallet_client_type !== "privy"
    );

    const googleAccount = privyUser.linked_accounts?.find(
      (acc: any) => acc.type === "google_oauth"
    );
    const emailAccount = privyUser.linked_accounts?.find(
      (acc: any) => acc.type === "email"
    );

    let authMethod: "wallet" | "google" | "email" = "wallet";
    let email: string | null = null;

    if (googleAccount && "email" in googleAccount) {
      authMethod = "google";
      email = (googleAccount as any).email;
    } else if (emailAccount && "address" in emailAccount) {
      authMethod = "email";
      email = (emailAccount as any).address;
    }

    const embeddedWallet =
      embeddedWalletObj && "address" in embeddedWalletObj
        ? (embeddedWalletObj as any).address as string
        : null;

    const externalWallet =
      externalWalletObj && "address" in externalWalletObj
        ? (externalWalletObj as any).address as string
        : null;

    // Step 4: Attach to request
    (request as any).user = {
      privyUserId: verifiedClaims.user_id,
      embeddedWallet,
      externalWallet,
      email,
      authMethod,
    } satisfies AuthUser;
  } catch (err: any) {
    sendUnauthorized(reply, "Invalid or expired Privy token.");
  }
}

/**
 * Convenience: get the primary wallet address for the authenticated user.
 * Returns embedded wallet first (that's what signs Solana txs), then external.
 */
export function getPrimaryWallet(user: AuthUser): string | null {
  return user.embeddedWallet ?? user.externalWallet ?? null;
}

/** Alias so routes can import { authenticate } */
export const authenticate = authMiddleware;

import type { FastifyRequest, FastifyReply } from "fastify";
import { sendForbidden } from "../utils/response.js";
import { fetchGame } from "../solana/accounts/fetchGame.js";
import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";

/**
 * Validates wallet signature for admin routes.
 * Completely bypasses Privy.
 */
export async function adminMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const sig64 = request.headers["x-admin-signature"] as string | undefined;
  const pubkey58 = request.headers["x-admin-pubkey"] as string | undefined;
  const timestampStr = request.headers["x-admin-timestamp"] as string | undefined;

  if (!sig64 || !pubkey58 || !timestampStr) {
    sendForbidden(reply, "Missing admin authentication headers.");
    return;
  }

  // Prevent replay attacks (5 minute window)
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp) || Date.now() - timestamp > 5 * 60 * 1000) {
    sendForbidden(reply, "Request timestamp expired.");
    return;
  }

  try {
    const pubkey = new PublicKey(pubkey58);
    const messageBytes = new TextEncoder().encode(`balzort-admin-${timestampStr}`);
    const signatureBytes = Buffer.from(sig64, "base64");

    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      pubkey.toBytes()
    );

    if (!isValid) {
      sendForbidden(reply, "Invalid wallet signature.");
      return;
    }

    const gameState = await fetchGame();
    if (!gameState) {
      sendForbidden(reply, "Game account not found on-chain.");
      return;
    }

    if (gameState.authority !== pubkey58) {
      sendForbidden(reply, "Admin access denied.");
      return;
    }

    // Pass the verified admin wallet into the request context
    (request as any).adminWallet = pubkey58;

  } catch (err: any) {
    console.error("[adminMiddleware] Failed to verify admin identity:", err.message);
    sendForbidden(reply, "Could not verify admin authority.");
    return;
  }
}
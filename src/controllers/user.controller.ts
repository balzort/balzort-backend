import type { FastifyRequest, FastifyReply } from "fastify";
import { Transaction, SystemProgram } from "@solana/web3.js";
import { privy, verifyAccessToken } from "../config/privyClient.js";
import { env } from "../config/env.js";
import { PlayerModel } from "../models/Player.js";
import { handleApiError } from "../utils/errorHandler.js";
import { sendSuccess, sendNotFound, sendError } from "../utils/response.js";
import {
  syncUserSchema,
  updateProfileSchema,
  walletParamSchema,
  historyQuerySchema,
  playerAccountUpdateSchema,
} from "../utils/validator.js";
import { PuzzleResultModel } from "../models/PuzzleResult.js";
import { connection } from "../config/solana.js";
import { program } from "../solana/program.js";
import { getPlayerPda, fetchPlayer } from "../solana/accounts/fetchPlayer.js";
import { getGamePda } from "../solana/accounts/fetchGame.js";
import { getServerWallet } from "../config/serverWallet.js";
import { PublicKey } from "@solana/web3.js";
import type { AuthUser } from "../middleware/auth.middleware.js";

export class UserController {
  /**
   * POST /users/sync
   *
   * Called once per login (not on every reload — the frontend uses
   * sessionStorage to deduplicate within a browser session).
   * Creates or fills in missing fields on the player row.
   */
  static async syncUser(req: FastifyRequest, reply: FastifyReply) {
    try {
      const body = syncUserSchema.parse(req.body);

      const verifiedClaims = await verifyAccessToken({
        access_token: body.token,
        app_id: env.PRIVY_APP_ID,
        verification_key: env.PRIVY_VERIFICATION_KEY,
      });

      const privyUser = await privy.users()._get(verifiedClaims.user_id);

      const embeddedWalletObj = privyUser.linked_accounts?.find(
        (acc: any) =>
          acc.type === "wallet" && acc.wallet_client_type === "privy",
      );
      const externalWalletObj = privyUser.linked_accounts?.find(
        (acc: any) =>
          acc.type === "wallet" && acc.wallet_client_type !== "privy",
      );

      const embeddedWalletAddress =
        embeddedWalletObj && "address" in embeddedWalletObj
          ? ((embeddedWalletObj as any).address as string)
          : null;

      const googleAccount = privyUser.linked_accounts?.find(
        (acc: any) => acc.type === "google_oauth",
      );
      const emailAccount = privyUser.linked_accounts?.find(
        (acc: any) => acc.type === "email",
      );

      let authMethod: "wallet" | "google" | "email" = "wallet";
      let email: string | null = null;
      let isEmailVerified = false;
      let finalExternalWalletAddress: string | null = null;

      if (googleAccount && "email" in googleAccount) {
        authMethod = "google";
        email = (googleAccount as any).email;
        isEmailVerified = true;
      } else if (emailAccount && "address" in emailAccount) {
        authMethod = "email";
        email = (emailAccount as any).address;
        isEmailVerified = !!(emailAccount as any).verified_at;
      } else {
        authMethod = "wallet";
        if (externalWalletObj && "address" in externalWalletObj) {
          finalExternalWalletAddress = (externalWalletObj as any)
            .address as string;
        } else {
          const anyWallet = privyUser.linked_accounts?.find(
            (acc: any) => acc.type === "wallet",
          );
          if (anyWallet && "address" in anyWallet) {
            finalExternalWalletAddress = (anyWallet as any).address as string;
          }
        }
      }

      let username = body.username;
      if (!username && email) {
        username = email.split("@")[0];
      }

      const { user, status } = await PlayerModel.smartSync({
        privy_user_id: privyUser.id,
        auth_method: authMethod,
        wallet_address: finalExternalWalletAddress,
        embedded_wallet_address: embeddedWalletAddress,
        email,
        is_email_verified: isEmailVerified,
        username,
      });

      if (status !== "no_change") {
        console.log(
          `✅ [UserController.syncUser] Player ${status}: ${privyUser.id}`,
        );
      }

      return sendSuccess(reply, { user, status });
    } catch (error) {
      return handleApiError(reply, error, "UserController.syncUser");
    }
  }

  /**
   * POST /users/prepare-player-tx
   *
   * Builds a create_player transaction using Anchor where:
   *   feePayer = server wallet  (covers all fees — user has zero SOL)
   *   signer   = embedded wallet (proves identity, derives the player PDA)
   *
   * Returns a base64-serialised, partially-signed transaction.
   * The frontend passes the raw bytes directly to Privy's
   * wallet.signAndSendTransaction() which shows the approval modal,
   * adds the embedded wallet signature, and broadcasts to devnet.
   *
   * If the player PDA already exists on-chain (e.g. created in a previous
   * session but DB wasn't updated), we skip the tx and just mark the DB.
   *
   * Requires: Authorization: Bearer <privy_token>
   */
  static async preparePlayerTx(req: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (req as any).user as AuthUser;

      // The embedded wallet is the on-chain identity — must exist first.
      const embeddedWallet = user.embeddedWallet;
      if (!embeddedWallet) {
        return sendError(
          reply,
          "Embedded wallet is not yet provisioned. Wait a moment and try again.",
          400,
        );
      }

      const signerPubkey = new PublicKey(embeddedWallet);

      // Derive PDAs using the same helpers the rest of the backend uses
      const playerPda = getPlayerPda(signerPubkey);
      const gamePda = getGamePda();

      // ── Idempotency check ────────────────────────────────────────────────
      // If the player account already exists on-chain (tx confirmed in a
      // previous session but DB was never updated), just mark it and return.
      const existing = await fetchPlayer(embeddedWallet);
      if (existing) {
        await PlayerModel.markPlayerAccountCreated(
          user.privyUserId,
          playerPda.toBase58(),
        );
        return sendSuccess(reply, {
          already_exists: true,
          player_account_pubkey: playerPda.toBase58(),
        });
      }

      // ── Build the instruction with Anchor ────────────────────────────────
      const serverWallet = getServerWallet();

      const ix = await program.methods
        .createPlayer()
        .accountsPartial({
          payer: serverWallet.publicKey, 
          signer: signerPubkey, 
          player: playerPda,
          game: gamePda,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      // ── Build the transaction ────────────────────────────────────────────
      const tx = new Transaction();
      tx.add(ix);

      // ── Airdrop 1,000 Custom Tokens ─────────────────────────────────────────
      try {
        const {
          createAssociatedTokenAccountInstruction,
          getAssociatedTokenAddress,
          createTransferInstruction,
          getAccount,
          getMint
        } = await import("@solana/spl-token");

        const tokenMintPubkey = new PublicKey(env.GAME_TOKEN_MINT);
        
        // Dynamically deduce the token program (supports both Token and Token-2022)
        const mintAccountInfo = await connection.getAccountInfo(tokenMintPubkey);
        if (!mintAccountInfo) {
          throw new Error("Game Token Mint not found on-chain");
        }
        const tokenProgramId = mintAccountInfo.owner;

        const serverTokenAccount = await getAssociatedTokenAddress(tokenMintPubkey, serverWallet.publicKey, false, tokenProgramId);
        const playerTokenAccount = await getAssociatedTokenAddress(tokenMintPubkey, signerPubkey, false, tokenProgramId);

        // Fetch Mint Info using the correct dynamically resolved programId
        const mintInfo = await getMint(connection, tokenMintPubkey, undefined, tokenProgramId);
        
        // Ensure Server ATA exists
        try {
          await getAccount(connection, serverTokenAccount, undefined, tokenProgramId);
        } catch (err: any) {
          if (err.name === "TokenAccountNotFoundError" || err.message.includes("could not find account") || err.name === "TokenInvalidAccountOwnerError") {
            tx.add(
              createAssociatedTokenAccountInstruction(
                serverWallet.publicKey,
                serverTokenAccount,
                serverWallet.publicKey,
                tokenMintPubkey,
                tokenProgramId
              )
            );
          }
        }

        // Ensure Player ATA exists
        try {
          await getAccount(connection, playerTokenAccount, undefined, tokenProgramId);
        } catch (err: any) {
          if (err.name === "TokenAccountNotFoundError" || err.message.includes("could not find account") || err.name === "TokenInvalidAccountOwnerError") {
            tx.add(
              createAssociatedTokenAccountInstruction(
                serverWallet.publicKey,    // Server pays the rent unconditionally
                playerTokenAccount,
                signerPubkey,              // Player owns the token account natively
                tokenMintPubkey,
                tokenProgramId
              )
            );
          }
        }

        // Force exactly 1,000 tokens explicitly
        const amount = BigInt(1000) * BigInt(Math.pow(10, mintInfo.decimals));

        // Transfer tokens from Server ATA to Player ATA
        tx.add(
          createTransferInstruction(
            serverTokenAccount,
            playerTokenAccount,
            serverWallet.publicKey,
            amount,
            [],
            tokenProgramId
          )
        );
      } catch (airdropError) {
        console.error("⚠️ [UserController] Failed to append Airdrop Instructions. Server Wallet likely missing SPL tokens or ATA:", airdropError);
      }

      // Server wallet is both the fee payer and the rent payer.
      // The embedded wallet only needs to sign — it needs zero SOL.
      tx.feePayer = serverWallet.publicKey;

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;

      // Server wallet partially signs. Embedded wallet signs on the frontend.
      tx.partialSign(serverWallet);

      const serialized = tx.serialize({ requireAllSignatures: false });

      return sendSuccess(reply, {
        already_exists: false,
        // base64 string — frontend converts to Uint8Array for Privy
        transaction: serialized.toString("base64"),
        player_account_pubkey: playerPda.toBase58(),
        blockhash,
        lastValidBlockHeight,
      });
    } catch (error) {
      return handleApiError(reply, error, "UserController.preparePlayerTx");
    }
  }

  /**
   * PATCH /users/profile
   * Update username or avatar. Requires Privy token in body.
   */
  static async updateProfile(req: FastifyRequest, reply: FastifyReply) {
    try {
      const body = updateProfileSchema.parse(req.body);

      const verifiedClaims = await verifyAccessToken({
        access_token: body.token,
        app_id: env.PRIVY_APP_ID,
        verification_key: env.PRIVY_VERIFICATION_KEY,
      });

      const user = await PlayerModel.updateProfile(verifiedClaims.user_id, {
        username: body.username,
        avatar_url: body.avatar_url,
      });

      return sendSuccess(reply, { user });
    } catch (error) {
      return handleApiError(reply, error, "UserController.updateProfile");
    }
  }

  /**
   * GET /users/:wallet
   * Public profile by wallet address.
   */
  static async getProfile(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { wallet } = walletParamSchema.parse(req.params);
      const player = await PlayerModel.findByWallet(wallet);
      if (!player) return sendNotFound(reply, "Player");
      return sendSuccess(reply, { player });
    } catch (error) {
      return handleApiError(reply, error, "UserController.getProfile");
    }
  }

  /**
   * GET /users/:wallet/history
   */
  static async getHistory(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { wallet } = walletParamSchema.parse(req.params);
      const { page, limit } = historyQuerySchema.parse(req.query);
      const { data, total } = await PuzzleResultModel.findByWallet(
        wallet,
        page,
        limit,
      );
      return reply.send({
        success: true,
        data,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      return handleApiError(reply, error, "UserController.getHistory");
    }
  }

  /**
   * PATCH /users/player-account
   * Called by frontend after the tx confirms. Marks player_account_created = true.
   */
  static async markPlayerAccount(req: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (req as any).user as AuthUser;
      const body = playerAccountUpdateSchema.parse(req.body);
      await PlayerModel.markPlayerAccountCreated(
        user.privyUserId,
        body.player_account_pubkey,
      );
      return sendSuccess(reply, {
        player_account_pubkey: body.player_account_pubkey,
      });
    } catch (error) {
      return handleApiError(reply, error, "UserController.markPlayerAccount");
    }
  }
}

import type { FastifyRequest, FastifyReply } from "fastify";
import {
  Transaction,
  SystemProgram,
  PublicKey,
  Keypair,
} from "@solana/web3.js";
import { program } from "../solana/program.js";
import { connection } from "../config/solana.js";
import { getServerWallet } from "../config/serverWallet.js";
import { getPlayerPda } from "../solana/accounts/fetchPlayer.js";
import { getGamePda } from "../solana/accounts/fetchGame.js";
import { getPuzzleBoardPda } from "../solana/accounts/fetchPuzzleBoard.js";
import { getPuzzleStatsPda } from "../solana/accounts/fetchPuzzleStats.js";
import { fetchPlayer } from "../solana/accounts/fetchPlayer.js";
import { handleApiError } from "../utils/errorHandler.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { z } from "zod";
import type { AuthUser } from "../middleware/auth.middleware.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEVNET_RPC = "https://api.devnet.solana.com";

// SOL funded to session key on openSession.
// Breakdown of what the session key pays:
//   createPuzzlePermissions : ~4.8M + ~4.8M lamports (two permission accounts)
//   delegatePuzzlePermissions: tx fee ~5K lamports
//   delegatePuzzle           : tx fee ~5K lamports
//   startPuzzle              : tx fee ~5K lamports
//   applyMove / applyUndo    : ~5K lamports each (TEE micro-fees)
//   finalizePuzzle           : tx fee ~5K lamports
// Total worst-case with 100 moves: ~10M + ~500K + fees ≈ 0.015 SOL
// We send 0.05 SOL for a comfortable buffer. Remainder is drained back on closeSession.
const SESSION_FUND_LAMPORTS = 50_000_000; // 0.05 SOL

// Session duration: 1 hour — matches MAX_SESSION_DURATION_SECS in constants.rs
const SESSION_DURATION_SECS = 3600;

// VRF oracle queue — devnet
const VRF_ORACLE_QUEUE = new PublicKey(
  "Cuj97ggrhhidhbu39TijNVqE74xvKJ69gDervRUXAxGh"
);

// TEE validator — devnet
const TEE_VALIDATOR = new PublicKey(
  "FnE6VJT5QNZdedZPnCoLsARgBwoE6DeJNjBs2H1gySXA"
);

// ─── Input schemas ────────────────────────────────────────────────────────────

const openSessionSchema = z.object({
  session_pubkey: z.string().min(32).max(44),
});

const initPuzzleSchema = z.object({
  session_pubkey: z.string().min(32).max(44),
  num_tubes: z.number().int().min(4).max(10),
  balls_per_tube: z.number().int().min(4).max(10),
  difficulty: z.number().int().min(0).max(2),
});

const finalizeSchema = z.object({
  puzzle_stats_pubkey: z.string().min(32).max(44),
  tx_signature: z.string().min(1),
});

const abandonSchema = z.object({
  puzzle_stats_pubkey: z.string().min(32).max(44),
  tx_signature: z.string().min(1),
});

const closeSessionSchema = z.object({
  session_pubkey: z.string().min(32).max(44),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function buildPartialTx(
  instructions: Parameters<Transaction["add"]>[0][],
  feePayer: PublicKey
): Promise<{ transaction: string; blockhash: string; lastValidBlockHeight: number }> {
  const serverWallet = getServerWallet();
  const tx = new Transaction();
  for (const ix of instructions) {
    tx.add(ix as Parameters<Transaction["add"]>[0]);
  }
  tx.feePayer = feePayer;
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.partialSign(serverWallet);
  const serialized = tx.serialize({ requireAllSignatures: false });
  return {
    transaction: serialized.toString("base64"),
    blockhash,
    lastValidBlockHeight,
  };
}

// ─── Controller ───────────────────────────────────────────────────────────────

export class GameController {
  /**
   * POST /game/prepare-open-session
   *
   * Builds a transaction that:
   * 1. Transfers 0.01 SOL from server wallet to session key (funds TEE fees)
   * 2. Calls openSession(sessionPubkey, SESSION_DURATION_SECS)
   *
   * feePayer = server wallet
   * signers needed from frontend: embedded wallet (calls openSession —
   *   signer must be player.wallet per the contract constraint)
   *
   * The server wallet partially signs. The embedded wallet adds its signature
   * via Privy's approval modal (one modal, for the whole session).
   */
  static async prepareOpenSession(req: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (req as any).user as AuthUser;
      const embeddedWallet = user.embeddedWallet;
      if (!embeddedWallet) {
        return sendError(reply, "Embedded wallet not provisioned.", 400);
      }

      const body = openSessionSchema.parse(req.body);
      const sessionPubkey = new PublicKey(body.session_pubkey);
      const embeddedPubkey = new PublicKey(embeddedWallet);
      const serverWallet = getServerWallet();

      const playerPda = getPlayerPda(embeddedPubkey);
      const gamePda = getGamePda();

      // 1. Fund session key with SOL for move fees
      const fundIx = SystemProgram.transfer({
        fromPubkey: serverWallet.publicKey,
        toPubkey: sessionPubkey,
        lamports: SESSION_FUND_LAMPORTS,
      });

      // 2. Open session on-chain
      const openSessionIx = await program.methods
        .openSession(sessionPubkey, SESSION_DURATION_SECS)
        .accountsPartial({
          signer: embeddedPubkey,
          player: playerPda,
        })
        .instruction();

      const result = await buildPartialTx(
        [fundIx, openSessionIx],
        serverWallet.publicKey
      );

      return sendSuccess(reply, {
        ...result,
        player_pda: playerPda.toBase58(),
        session_expires_in_secs: SESSION_DURATION_SECS,
      });
    } catch (error) {
      return handleApiError(reply, error, "GameController.prepareOpenSession");
    }
  }

  /**
   * POST /game/prepare-init-puzzle
   *
   * Builds a transaction that calls initPuzzle(numTubes, ballsPerTube, difficulty).
   * feePayer = server wallet, payer (for PuzzleBoard + PuzzleStats rent) = server wallet
   * signer = session key (proves session is open, increments nonce)
   *
   * Returns the partially-signed tx + the derived puzzle PDAs so the frontend
   * knows where to poll for VRF completion.
   */
  static async prepareInitPuzzle(req: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (req as any).user as AuthUser;
      const embeddedWallet = user.embeddedWallet;
      if (!embeddedWallet) {
        return sendError(reply, "Embedded wallet not provisioned.", 400);
      }

      const body = initPuzzleSchema.parse(req.body);
      const embeddedPubkey = new PublicKey(embeddedWallet);
      const sessionPubkey = new PublicKey(body.session_pubkey);
      const serverWallet = getServerWallet();

      const playerPda = getPlayerPda(embeddedPubkey);
      const gamePda = getGamePda();

      // Fetch player to get current nonce for PDA derivation
      const playerAccount = await fetchPlayer(embeddedWallet);
      if (!playerAccount) {
        return sendError(reply, "Player account not found on-chain.", 404);
      }

      const nonce = playerAccount.puzzlesStartedNonce;
      const puzzleBoardPda = getPuzzleBoardPda(playerPda, nonce);
      const puzzleStatsPda = getPuzzleStatsPda(playerPda, nonce);

      const initPuzzleIx = await program.methods
        .initPuzzle(body.num_tubes, body.balls_per_tube, body.difficulty)
        .accountsPartial({
          payer: serverWallet.publicKey,
          // signer must be the session key — it proves the session is open
          // and the contract validates it against player.session_key on-chain
          signer: sessionPubkey,
          player: playerPda,
          game: gamePda,
          puzzleBoard: puzzleBoardPda,
          puzzleStats: puzzleStatsPda,
          oracleQueue: VRF_ORACLE_QUEUE,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const result = await buildPartialTx(
        [initPuzzleIx],
        serverWallet.publicKey
      );

      return sendSuccess(reply, {
        ...result,
        puzzle_board_pubkey: puzzleBoardPda.toBase58(),
        puzzle_stats_pubkey: puzzleStatsPda.toBase58(),
        player_pda: playerPda.toBase58(),
        nonce: nonce.toString(),
      });
    } catch (error) {
      return handleApiError(reply, error, "GameController.prepareInitPuzzle");
    }
  }

  /**
   * POST /game/prepare-close-session
   *
   * Builds a transaction that:
   * 1. Calls closeSession (session key or embedded wallet signs)
   * 2. Drains remaining SOL from session key back to server wallet
   *
   * feePayer = server wallet
   * signers needed: embedded wallet (closeSession requires player.wallet == signer)
   *
   * The drain instruction is signed by the session key on the frontend BEFORE
   * this tx is broadcast — we return the tx unsigned so the frontend can have
   * both the embedded wallet and session key sign it.
   */
  static async prepareCloseSession(req: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (req as any).user as AuthUser;
      const embeddedWallet = user.embeddedWallet;
      if (!embeddedWallet) {
        return sendError(reply, "Embedded wallet not provisioned.", 400);
      }

      const body = closeSessionSchema.parse(req.body);
      const sessionPubkey = new PublicKey(body.session_pubkey);
      const embeddedPubkey = new PublicKey(embeddedWallet);
      const serverWallet = getServerWallet();

      const playerPda = getPlayerPda(embeddedPubkey);

      // 1. Close session on-chain
      const closeSessionIx = await program.methods
        .closeSession()
        .accountsPartial({
          signer: embeddedPubkey,
          player: playerPda,
        })
        .instruction();

      // 2. Drain remaining SOL from session key to server wallet.
      // We use the minimum rent-exempt amount (0) since the session key
      // is a plain keypair, not a Solana account with data — we drain everything.
      // The actual lamports amount is computed on the frontend after fetching
      // the session key balance, so we pass a placeholder here and let the
      // frontend override it. For simplicity, we pass the full drain amount
      // from the frontend.
      //
      // NOTE: The drain instruction is built on the frontend since only
      // the frontend knows the exact current session key balance.
      // We return the closeSession instruction only; the frontend appends
      // the drain instruction.

      const tx = new Transaction();
      tx.add(closeSessionIx);
      tx.feePayer = serverWallet.publicKey;

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;

      // Server wallet signs as fee payer
      tx.partialSign(serverWallet);

      const serialized = tx.serialize({ requireAllSignatures: false });

      return sendSuccess(reply, {
        transaction: serialized.toString("base64"),
        blockhash,
        lastValidBlockHeight,
        server_wallet_pubkey: serverWallet.publicKey.toBase58(),
      });
    } catch (error) {
      return handleApiError(reply, error, "GameController.prepareCloseSession");
    }
  }
}
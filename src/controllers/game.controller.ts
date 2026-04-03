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
import { getAssociatedTokenAddress, getAccount, TokenAccountNotFoundError, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import { fetchPlayer } from "../solana/accounts/fetchPlayer.js";
import { handleApiError } from "../utils/errorHandler.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { z } from "zod";
import type { AuthUser } from "../middleware/auth.middleware.js";
import BN from "bn.js";
import { TournamentModel } from "../models/Tournament.js";
import { TournamentEntryModel } from "../models/TournamentEntry.js";

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

  /**
   * POST /game/prepare-join-tournament
   * Builds the transaction so the embedded wallet can join a tournament.
   * feePayer = server wallet
   */
  static async prepareJoinTournament(req: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (req as any).user as AuthUser;
      const embeddedWallet = user.embeddedWallet;
      if (!embeddedWallet) {
        return sendError(reply, "Embedded wallet not provisioned.", 400);
      }

      const { tournament_on_chain_address, amount_usdc } = z
        .object({ 
          tournament_on_chain_address: z.string().min(32).max(44),
          amount_usdc: z.number().min(0).optional()
        })
        .parse(req.body);

      const tournament = await TournamentModel.findByOnChainAddress(
        tournament_on_chain_address
      );
      if (!tournament) return sendError(reply, "Tournament not found", 404);

      const minimumEntryFee = BigInt(tournament.entry_fee);
      let depositAmount = minimumEntryFee;
      if (amount_usdc !== undefined) {
        depositAmount = BigInt(Math.round(amount_usdc * 1_000_000));
        if (depositAmount < minimumEntryFee) {
          return sendError(reply, `Deposit amount must be at least ${Number(minimumEntryFee) / 1_000_000} tokens`, 400);
        }
      }

      const embeddedPubkey = new PublicKey(embeddedWallet);
      const tournamentPubkey = new PublicKey(tournament_on_chain_address);
      const serverWallet = getServerWallet();

      const playerPda = getPlayerPda(embeddedPubkey);

      const { SEEDS, PROGRAM_ID } = await import("../utils/constants.js");
      const idBuf = Buffer.alloc(8);
      new BN(tournament.on_chain_id).toArrayLike(Buffer, "le", 8).copy(idBuf);
      
      const [vaultPda] = PublicKey.findProgramAddressSync(
        [SEEDS.TOURNAMENT_VAULT, idBuf],
        PROGRAM_ID
      );

      const [entryPda] = PublicKey.findProgramAddressSync(
        [SEEDS.TOURNAMENT_ENTRY, tournamentPubkey.toBuffer(), embeddedPubkey.toBuffer()],
        PROGRAM_ID
      );

      const tokenMintStr = tournament.token_mint;
      if (!tokenMintStr) {
        return sendError(reply, "Tournament token_mint is missing in database.", 500);
      }
      const tokenMintPubkey = new PublicKey(tokenMintStr);
      
      const mintInfo = await connection.getAccountInfo(tokenMintPubkey);
      if (!mintInfo) return sendError(reply, "Mint not found.", 404);
      const tokenProgramId = mintInfo.owner;

      const playerTokenAccount = await getAssociatedTokenAddress(
        tokenMintPubkey,
        embeddedPubkey,
        false,
        tokenProgramId
      );

      try {
        const account = await getAccount(connection, playerTokenAccount, "confirmed", tokenProgramId);
        if (BigInt(account.amount.toString()) < depositAmount) {
          return sendError(
            reply, 
            `Insufficient tokens. Please deposit at least ${Number(depositAmount) / 1000000} tokens into your embedded wallet: ${embeddedWallet}`, 
            400
          );
        }
      } catch (err) {
        if (err instanceof TokenAccountNotFoundError || (err as Error).name === "TokenAccountNotFoundError" || (err as Error).name === "TokenInvalidAccountOwnerError") {
          return sendError(
            reply, 
            `You do not have a token account for this game. Please deposit at least ${Number(depositAmount) / 1000000} tokens into your embedded wallet: ${embeddedWallet}`, 
            400
          );
        }
      }

      const joinIx = await program.methods
        .joinTournament(new BN(depositAmount.toString()))
        .accountsPartial({
          payer: serverWallet.publicKey,
          signer: embeddedPubkey,
          player: playerPda,
          tournament: tournamentPubkey,
          tournamentVault: vaultPda,
          playerTokenAccount,
          tournamentEntry: entryPda,
          tokenMint: tokenMintPubkey,
          tokenProgram: tokenProgramId,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const result = await buildPartialTx([joinIx], serverWallet.publicKey);

      return sendSuccess(reply, result);
    } catch (error) {
      return handleApiError(reply, error, "GameController.prepareJoinTournament");
    }
  }

  /**
   * POST /game/prepare-record-tournament-result
   *
   * Builds a transaction that calls recordTournamentResult.
   * The session key is the signer (no popup needed).
   * feePayer = server wallet
   *
   * We fetch the on-chain tournament entry to get its puzzle_nonce,
   * then derive the correct puzzle_stats PDA from that nonce — matching
   * exactly how the smart contract derives it in its seeds constraint.
   */
  static async prepareRecordTournamentResult(req: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (req as any).user as AuthUser;
      const embeddedWallet = user.embeddedWallet;
      if (!embeddedWallet) {
        return sendError(reply, "Embedded wallet not provisioned.", 400);
      }

      const body = z.object({
        session_pubkey: z.string().min(32).max(44),
        tournament_on_chain_address: z.string().min(32).max(44),
      }).parse(req.body);

      const embeddedPubkey = new PublicKey(embeddedWallet);
      const sessionPubkey = new PublicKey(body.session_pubkey);
      const tournamentPubkey = new PublicKey(body.tournament_on_chain_address);

      const playerPda = getPlayerPda(embeddedPubkey);

      const tournament = await TournamentModel.findByOnChainAddress(body.tournament_on_chain_address);
      if (!tournament) return sendError(reply, "Tournament not found", 404);

      const { SEEDS, PROGRAM_ID } = await import("../utils/constants.js");

      // Derive the tournament entry PDA using the wallet (matching on-chain seed derivation)
      const [entryPda] = PublicKey.findProgramAddressSync(
        [SEEDS.TOURNAMENT_ENTRY, tournamentPubkey.toBuffer(), embeddedPubkey.toBuffer()],
        PROGRAM_ID
      );

      // Fetch the on-chain tournament entry to read its puzzle_nonce
      const entryAccount = await program.account.tournamentEntry.fetch(entryPda);
      const puzzleNonce = BigInt(entryAccount.puzzleNonce.toString());

      // Derive puzzle_stats PDA using the entry's puzzle_nonce
      const puzzleStatsPda = getPuzzleStatsPda(playerPda, puzzleNonce);

      const recordIx = await program.methods
        .recordTournamentResult()
        .accountsPartial({
          signer: sessionPubkey,
          player: playerPda,
          tournament: tournamentPubkey,
          tournamentEntry: entryPda,
          puzzleStats: puzzleStatsPda,
        })
        .instruction();

      // Server wallet pays fees — session key only signs the instruction
      const serverWallet = getServerWallet();
      const result = await buildPartialTx([recordIx], serverWallet.publicKey);

      // Also fetch PuzzleStats from chain and pre-populate the entry stats in DB.
      // The on-chain entry doesn't store elapsed_secs/move_count, only the event does,
      // and the sync job races with the indexer — so we fill them in here directly.
      try {
        const statsAccount = await program.account.puzzleStats.fetch(puzzleStatsPda);
        const elapsedSecs = Math.max(
          (statsAccount.completedAt?.toNumber?.() ?? 0) - (statsAccount.startedAt?.toNumber?.() ?? 0),
          0
        );
        const moveCount = statsAccount.moveCount ?? 0;
        // Compute parimutuel weight the same way the contract does
        // weight = 1_000_000_000 / (1 + elapsed_secs * 10 + move_count)
        const weight = BigInt(1_000_000_000) / (BigInt(1) + BigInt(elapsedSecs) * BigInt(10) + BigInt(moveCount));
        
        await TournamentEntryModel.markCompleted(
          body.tournament_on_chain_address,
          playerPda.toBase58(),
          elapsedSecs,
          moveCount,
          weight.toString()
        );
      } catch (statsErr: any) {
        console.error("[prepareRecordTournamentResult] Failed to pre-populate stats:", statsErr.message);
        // Non-fatal — the indexer or sync will handle it eventually
      }

      return sendSuccess(reply, result);
    } catch (error) {
      return handleApiError(reply, error, "GameController.prepareRecordTournamentResult");
    }
  }

  /**
   * POST /game/prepare-claim-prize
   *
   * Builds a transaction that calls claimPrize.
   * The player (embedded wallet) is the signer and pays the transaction fee.
   * Checks if the player needs a USDC ATA and prepends creation if missing.
   */
  static async prepareClaimPrize(req: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (req as any).user as AuthUser;
      const embeddedWallet = user.embeddedWallet;
      if (!embeddedWallet) {
        return sendError(reply, "Embedded wallet not provisioned.", 400);
      }

      const body = z.object({
        tournament_on_chain_address: z.string().min(32).max(44),
      }).parse(req.body);

      const tournament = await TournamentModel.findByOnChainAddress(body.tournament_on_chain_address);
      if (!tournament) return sendError(reply, "Tournament not found on-chain.", 404);
      if (!tournament.is_closed) return sendError(reply, "Tournament hasn't closed yet.", 400);

      const embeddedPubkey = new PublicKey(embeddedWallet);
      const tournamentPubkey = new PublicKey(body.tournament_on_chain_address);
      const tokenMintPubkey = new PublicKey(tournament.token_mint ?? "");

      const { SEEDS, PROGRAM_ID } = await import("../utils/constants.js");
      const idBuf = Buffer.alloc(8);
      new BN(tournament.on_chain_id).toArrayLike(Buffer, "le", 8).copy(idBuf);
      
      const [vaultPda] = PublicKey.findProgramAddressSync(
        [SEEDS.TOURNAMENT_VAULT, idBuf],
        PROGRAM_ID
      );

      const [entryPda] = PublicKey.findProgramAddressSync(
        [SEEDS.TOURNAMENT_ENTRY, tournamentPubkey.toBuffer(), embeddedPubkey.toBuffer()],
        PROGRAM_ID
      );

      const mintInfo = await connection.getAccountInfo(tokenMintPubkey);
      if (!mintInfo) return sendError(reply, "Mint not found.", 404);
      const tokenProgramId = mintInfo.owner;

      const playerTokenAccount = await getAssociatedTokenAddress(
        tokenMintPubkey,
        embeddedPubkey,
        false,
        tokenProgramId
      );

      const serverWallet = getServerWallet();

      const instructions = [];

      try {
        await getAccount(connection, playerTokenAccount, "confirmed", tokenProgramId);
      } catch (err: any) {
        if (err instanceof TokenAccountNotFoundError || err.name === "TokenAccountNotFoundError" || err.name === "TokenInvalidAccountOwnerError") {
          instructions.push(
            createAssociatedTokenAccountInstruction(
              serverWallet.publicKey, // server pays the 0.002 SOL rent exemption
              playerTokenAccount,     // ata
              embeddedPubkey,         // owner is still the player
              tokenMintPubkey,        // mint
              tokenProgramId          // tokenProgram ID
            )
          );
        }
      }

      const [playerPda] = PublicKey.findProgramAddressSync(
        [SEEDS.PLAYER, embeddedPubkey.toBuffer()],
        PROGRAM_ID
      );

      const claimIx = await program.methods
        .claimPrize()
        .accountsPartial({
          player: embeddedPubkey,
          playerAccount: playerPda,
          tournament: tournamentPubkey,
          tournamentVault: vaultPda,
          tournamentEntry: entryPda,
          playerTokenAccount,
          tokenMint: tokenMintPubkey,
          tokenProgram: tokenProgramId,
          systemProgram: SystemProgram.programId,
        } as any)
        .instruction();

      instructions.push(claimIx);

      const result = await buildPartialTx(instructions, serverWallet.publicKey);

      return sendSuccess(reply, result);

    } catch (error) {
      return handleApiError(reply, error, "GameController.prepareClaimPrize");
    }
  }
}
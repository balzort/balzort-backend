import type { FastifyRequest, FastifyReply } from "fastify";
import {
  VersionedTransaction,
  TransactionMessage,
  TransactionInstruction,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TokenAccountNotFoundError,
  createTransferInstruction,
} from "@solana/spl-token";
import { program } from "../solana/program.js";
import { connection } from "../config/solana.js";
import { getServerWallet } from "../config/serverWallet.js";
import { fetchGame, getGamePda } from "../solana/accounts/fetchGame.js";
import { getTournamentPda } from "../solana/accounts/fetchTournament.js";
import { TournamentModel } from "../models/Tournament.js";
import { handleApiError } from "../utils/errorHandler.js";
import { sendSuccess, sendError, sendNotFound } from "../utils/response.js";
import { difficultyLabel } from "../utils/constants.js";
import { supabase } from "../config/supabase.js";
import { z } from "zod";
import BN from "bn.js";
import { WebSocketService } from "../services/websocket.service.js";

// ─── Input schemas ────────────────────────────────────────────────────────────

const updateGameSchema = z.object({
  treasury: z.string().min(32).max(44).optional(),
  treasury_fee_bps: z.number().int().min(0).max(2000).optional(),
  is_paused: z.boolean().optional(),
});

const createTournamentSchema = z.object({
  entry_fee_usdc: z.number().min(0),       // in USDC units (e.g. 1.5 = 1.5 USDC)
  difficulty: z.number().int().min(0).max(2),
  duration_hours: z.number().min(0.1),     // hours → converted to secs
  max_time_mins: z.number().min(1),        // minutes → converted to secs
  num_tubes: z.number().int().min(4).max(10),
  balls_per_tube: z.number().int().min(4).max(10),
});

const closeTournamentSchema = z.object({
  tournament_on_chain_address: z.string().min(32).max(44),
});

const playerLookupSchema = z.object({
  wallet: z.string().min(32).max(44),
});

const withdrawTreasurySchema = z.object({
  amount_usdc: z.number().min(0.000001),
  destination_wallet: z.string().min(32).max(44),
  token_mint: z.string().min(32).max(44),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function buildUnsignedTx(
  instructions: TransactionInstruction[],
  feePayer: PublicKey
): Promise<{ transaction: string; blockhash: string; lastValidBlockHeight: number }> {
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  const messageV0 = new TransactionMessage({
    payerKey: feePayer,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();

  const tx = new VersionedTransaction(messageV0);

  return {
    transaction: Buffer.from(tx.serialize()).toString("base64"),
    blockhash,
    lastValidBlockHeight,
  };
}

// ─── Controller ───────────────────────────────────────────────────────────────

export class AdminController {
  /**
   * GET /api/admin/me
   * Returns the connected admin wallet and on-chain game state.
   * Used by the frontend useAdminGuard hook to bootstrap the admin dashboard.
   */
  static async getMe(req: FastifyRequest, reply: FastifyReply) {
    try {
      const authorityWallet = (req as any).adminWallet as string;
      const gameData = await fetchGame();
      if (!gameData) {
        return sendError(reply, "Game account not found on-chain.", 500);
      }

      return sendSuccess(reply, {
        is_admin: true,
        admin_wallet: authorityWallet,
        game_state: {
          authority: gameData.authority,
          treasury: gameData.treasury,
          treasury_fee_bps: gameData.treasuryFeeBps,
          is_paused: gameData.isPaused,
          tournament_count: gameData.tournamentCount.toString(),
          bump: gameData.bump,
        },
      });
    } catch (error) {
      return handleApiError(reply, error, "AdminController.getMe");
    }
  }

  /**
   * POST /api/admin/prepare-update-game
   * Builds update_game tx. Authority wallet is fee payer — no server signing.
   */
  static async prepareUpdateGame(req: FastifyRequest, reply: FastifyReply) {
    try {
      const authorityWallet = (req as any).adminWallet as string;
      if (!authorityWallet) {
        return sendError(reply, "Admin wallet not provisioned.", 400);
      }

      const body = updateGameSchema.parse(req.body);
      const authorityPubkey = new PublicKey(authorityWallet);
      const gamePda = getGamePda();

      const params: {
        treasury: PublicKey | null;
        treasuryFeeBps: number | null;
        isPaused: boolean | null;
      } = {
        treasury: body.treasury ? new PublicKey(body.treasury) : null,
        treasuryFeeBps: body.treasury_fee_bps ?? null,
        isPaused: body.is_paused ?? null,
      };

      const ix = await program.methods
        .updateGame(params)
        .accountsPartial({
          authority: authorityPubkey,
          game: gamePda,
        })
        .instruction();

      const result = await buildUnsignedTx([ix], authorityPubkey);

      return sendSuccess(reply, result);
    } catch (error) {
      return handleApiError(reply, error, "AdminController.prepareUpdateGame");
    }
  }

  /**
   * POST /api/admin/prepare-create-tournament
   * Builds create_tournament tx. Authority is fee payer.
   * After broadcast, frontend calls POST /api/admin/sync-tournament to upsert DB.
   */
  static async prepareCreateTournament(req: FastifyRequest, reply: FastifyReply) {
    try {
      const authorityWallet = (req as any).adminWallet as string;
      if (!authorityWallet) {
        return sendError(reply, "Admin wallet not provisioned.", 400);
      }

      const body = createTournamentSchema.parse(req.body);
      const authorityPubkey = new PublicKey(authorityWallet);
      const tokenMintPubkey = new PublicKey(process.env.GAME_TOKEN_MINT!);
      const gamePda = getGamePda();

      const mintInfo = await connection.getAccountInfo(tokenMintPubkey);
      if (!mintInfo) return sendError(reply, "Mint not found.", 404);
      const tokenProgramId = mintInfo.owner;

      // Fetch current tournament count to derive the right PDAs
      const gameState = await fetchGame();
      if (!gameState) {
        return sendError(reply, "Game account not found on-chain.", 404);
      }

      const tournamentCount = BigInt(gameState.tournamentCount.toString());
      const tournamentPda = getTournamentPda(tournamentCount);

      // Derive tournament vault PDA
      const { SEEDS, PROGRAM_ID } = await import("../utils/constants.js");
      const countBuf = Buffer.alloc(8);
      new BN(tournamentCount.toString()).toArrayLike(Buffer, "le", 8).copy(countBuf);
      const [vaultPda] = PublicKey.findProgramAddressSync(
        [SEEDS.TOURNAMENT_VAULT, countBuf],
        PROGRAM_ID
      );

      // Convert human-readable values to on-chain units
      // USDC has 6 decimals
      const entryFeeRaw = BigInt(Math.round(body.entry_fee_usdc * 1_000_000));
      const durationSecs = BigInt(Math.round(body.duration_hours * 3600));
      const maxTimeSecs = BigInt(body.max_time_mins * 60);

      const params = {
        entryFee: new BN(entryFeeRaw.toString()),
        difficulty: body.difficulty,
        durationSecs: new BN(durationSecs.toString()),
        maxTimeSecs: new BN(maxTimeSecs.toString()),
        numTubes: body.num_tubes,
        ballsPerTube: body.balls_per_tube,
      };

      const ix = await program.methods
        .createTournament(params)
        .accountsPartial({
          authority: authorityPubkey,
          game: gamePda,
          tokenMint: tokenMintPubkey,
          tournament: tournamentPda,
          tournamentVault: vaultPda,
          tokenProgram: tokenProgramId,
        })
        .instruction();

      const result = await buildUnsignedTx([ix], authorityPubkey);

      return sendSuccess(reply, {
        ...result,
        tournament_pda: tournamentPda.toBase58(),
        tournament_vault_pda: vaultPda.toBase58(),
        tournament_id: tournamentCount.toString(),
      });
    } catch (error) {
      return handleApiError(reply, error, "AdminController.prepareCreateTournament");
    }
  }

  /**
   * POST /api/admin/sync-tournament
   * Called by frontend after create_tournament broadcast succeeds.
   * Fetches the tournament from chain and upserts into DB.
   */
  static async syncTournament(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { tournament_address } = z
        .object({ tournament_address: z.string().min(32).max(44) })
        .parse(req.body);

      const { fetchTournamentByAddress } = await import(
        "../solana/accounts/fetchTournament.js"
      );
      const onChainData = await fetchTournamentByAddress(tournament_address);
      if (!onChainData) {
        return sendError(reply, "Tournament not found on-chain.", 404);
      }

      const row = await TournamentModel.upsert({
        on_chain_address: tournament_address,
        on_chain_id: onChainData.tournamentId.toString(),
        authority: onChainData.authority,
        token_mint: onChainData.tokenMint.toString(),
        entry_fee: onChainData.entryFee.toString(),
        prize_pool: onChainData.prizePool.toString(),
        net_prize_pool: onChainData.netPrizePool.toString(),
        treasury_fee_bps: onChainData.treasuryFeeBps,
        difficulty: onChainData.difficulty,
        num_tubes: onChainData.numTubes ?? 0,
        balls_per_tube: onChainData.ballsPerTube ?? 0,
        start_time: onChainData.startTime,
        end_time: onChainData.endTime,
        total_entries: onChainData.totalEntries,
        total_completers: onChainData.totalCompleters,
        cumulative_weight: onChainData.cumulativeWeight.toString(),
        is_closed: onChainData.isClosed,
      });

      // Broadcast so admin dashboard updates without manual refresh
      WebSocketService.broadcast("tournament_created", {
        on_chain_address: tournament_address,
        difficulty: onChainData.difficulty,
        prize_pool: onChainData.prizePool.toString(),
        is_closed: onChainData.isClosed,
      });
      WebSocketService.broadcast("platform_stats_changed", {});

      return sendSuccess(reply, {
        tournament: { ...row, difficulty_label: difficultyLabel(row.difficulty) },
      });
    } catch (error) {
      return handleApiError(reply, error, "AdminController.syncTournament");
    }
  }

  /**
   * POST /api/admin/prepare-close-tournament
   * Builds close_tournament tx. Authority is fee payer.
   */
  static async prepareCloseTournament(req: FastifyRequest, reply: FastifyReply) {
    try {
      const authorityWallet = (req as any).adminWallet as string;
      if (!authorityWallet) {
        return sendError(reply, "Admin wallet not provisioned.", 400);
      }

      const body = closeTournamentSchema.parse(req.body);
      const authorityPubkey = new PublicKey(authorityWallet);
      const gameRef = await fetchGame();
      if (!gameRef) return sendError(reply, "Game not found.", 404);
      const gamePda = getGamePda();

      const tournament = await TournamentModel.findByOnChainAddress(
        body.tournament_on_chain_address
      );
      if (!tournament) return sendNotFound(reply, "Tournament");

      const tournamentPubkey = new PublicKey(body.tournament_on_chain_address);
      const tokenMintPubkey = new PublicKey(tournament.token_mint ?? "");

      const mintInfo = await connection.getAccountInfo(tokenMintPubkey);
      if (!mintInfo) return sendError(reply, "Mint not found.", 404);
      const tokenProgramId = mintInfo.owner;

      const treasuryTokenAccountPubkey = await getAssociatedTokenAddress(
        tokenMintPubkey,
        new PublicKey(gameRef.treasury),
        true,
        tokenProgramId
      );

      // Derive tournament vault PDA
      const { SEEDS, PROGRAM_ID } = await import("../utils/constants.js");
      const idBuf = Buffer.alloc(8);
      new BN(tournament.on_chain_id).toArrayLike(Buffer, "le", 8).copy(idBuf);
      const [vaultPda] = PublicKey.findProgramAddressSync(
        [SEEDS.TOURNAMENT_VAULT, idBuf],
        PROGRAM_ID
      );

      let createAtaIx: TransactionInstruction | null = null;
      try {
        await getAccount(connection, treasuryTokenAccountPubkey, "confirmed", tokenProgramId);
      } catch (e: any) {
        if (e instanceof TokenAccountNotFoundError || e.name === "TokenAccountNotFoundError" || e.name === "TokenInvalidAccountOwnerError") {
          createAtaIx = createAssociatedTokenAccountInstruction(
            authorityPubkey, // payer
            treasuryTokenAccountPubkey, // ata
            new PublicKey(gameRef.treasury), // owner
            tokenMintPubkey, // mint
            tokenProgramId // programId
          );
        }
      }

      const ix = await program.methods
        .closeTournament()
        .accountsPartial({
          payer: authorityPubkey,
          tournament: tournamentPubkey,
          tournamentVault: vaultPda,
          game: gamePda,
          treasuryTokenAccount: treasuryTokenAccountPubkey,
          tokenProgram: tokenProgramId,
        })
        .instruction();

      const instructions = [];
      if (createAtaIx) instructions.push(createAtaIx);
      instructions.push(ix);

      const result = await buildUnsignedTx(instructions, authorityPubkey);

      return sendSuccess(reply, result);
    } catch (error) {
      return handleApiError(reply, error, "AdminController.prepareCloseTournament");
    }
  }

  /**
   * GET /api/admin/stats
   * Platform-wide aggregated stats from Supabase.
   */
  static async getPlatformStats(req: FastifyRequest, reply: FastifyReply) {
    try {
      const [
        { count: totalPlayers },
        { count: totalPuzzlesSolved },
        { data: prizeData },
        { count: activeTournaments },
        { count: totalTournaments },
      ] = await Promise.all([
        supabase.from("players").select("*", { count: "exact", head: true }),
        supabase
          .from("puzzle_results")
          .select("*", { count: "exact", head: true })
          .eq("is_solved", true),
        supabase
          .from("tournament_entries")
          .select("prize_claimed")
          .eq("has_claimed", true),
        supabase
          .from("tournaments")
          .select("*", { count: "exact", head: true })
          .eq("is_closed", false)
          .gt("end_time", new Date().toISOString()),
        supabase.from("tournaments").select("*", { count: "exact", head: true }),
      ]);

      const totalPrizeDistributed = (prizeData ?? []).reduce(
        (sum: bigint, row: { prize_claimed: string | null }) =>
          sum + BigInt(row.prize_claimed ?? "0"),
        BigInt(0)
      );

      return sendSuccess(reply, {
        total_players: totalPlayers ?? 0,
        total_puzzles_solved: totalPuzzlesSolved ?? 0,
        total_prize_distributed_raw: totalPrizeDistributed.toString(),
        total_prize_distributed_usdc: (
          Number(totalPrizeDistributed) / 1_000_000
        ).toFixed(2),
        active_tournaments: activeTournaments ?? 0,
        total_tournaments: totalTournaments ?? 0,
      });
    } catch (error) {
      return handleApiError(reply, error, "AdminController.getPlatformStats");
    }
  }

  /**
   * GET /api/admin/activity
   * Recent activity feed — merges recent tournaments, entries, puzzles.
   */
  static async getActivityFeed(req: FastifyRequest, reply: FastifyReply) {
    try {
      const [
        { data: recentTournaments },
        { data: recentEntries },
        { data: recentPuzzles },
      ] = await Promise.all([
        supabase
          .from("tournaments")
          .select("on_chain_address, difficulty, prize_pool, is_closed, created_at, updated_at")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("tournament_entries")
          .select("tournament_address, player_wallet, completed, has_claimed, created_at, updated_at")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("puzzle_results")
          .select("player_wallet, difficulty, is_solved, is_abandoned, final_score, created_at")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      // Unify into a single feed sorted by timestamp
      const feed: Array<{
        type: string;
        timestamp: string;
        description: string;
        meta: Record<string, unknown>;
      }> = [];

      for (const t of recentTournaments ?? []) {
        feed.push({
          type: t.is_closed ? "tournament_closed" : "tournament_created",
          timestamp: t.created_at,
          description: t.is_closed
            ? `Tournament closed — ${difficultyLabel(t.difficulty)} difficulty`
            : `New tournament created — ${difficultyLabel(t.difficulty)} difficulty`,
          meta: {
            address: t.on_chain_address,
            prize_pool: t.prize_pool,
            difficulty: t.difficulty,
          },
        });
      }

      for (const e of recentEntries ?? []) {
        const action = e.has_claimed
          ? "prize_claimed"
          : e.completed
          ? "tournament_completed"
          : "tournament_joined";
        feed.push({
          type: action,
          timestamp: e.updated_at ?? e.created_at,
          description:
            action === "prize_claimed"
              ? `Player claimed prize — ${e.player_wallet.slice(0, 8)}…`
              : action === "tournament_completed"
              ? `Player completed tournament — ${e.player_wallet.slice(0, 8)}…`
              : `Player joined tournament — ${e.player_wallet.slice(0, 8)}…`,
          meta: {
            tournament: e.tournament_address,
            player: e.player_wallet,
          },
        });
      }

      for (const p of recentPuzzles ?? []) {
        const puzzleStatus = p.is_solved ? "solved" : p.is_abandoned ? "abandoned" : "in_progress";
        feed.push({
          type: `puzzle_${puzzleStatus}`,
          timestamp: p.created_at,
          description: `Puzzle ${puzzleStatus} — ${difficultyLabel(p.difficulty)} — score ${p.final_score?.toLocaleString() ?? "—"}`,
          meta: {
            player: p.player_wallet,
            difficulty: p.difficulty,
            score: p.final_score,
          },
        });
      }

      feed.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return sendSuccess(reply, { feed: feed.slice(0, 30) });
    } catch (error) {
      return handleApiError(reply, error, "AdminController.getActivityFeed");
    }
  }

  /**
   * GET /api/admin/player-lookup?wallet=...
   * Returns player profile + puzzle history.
   */
  static async getPlayerLookup(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { wallet } = playerLookupSchema.parse(req.query);

      const [{ data: player }, { data: puzzles }, { data: entries }] =
        await Promise.all([
          supabase.from("players").select("*").eq("wallet_address", wallet).single(),
          supabase
            .from("puzzle_results")
            .select("*")
            .eq("player_wallet", wallet)
            .order("created_at", { ascending: false })
            .limit(20),
          supabase
            .from("tournament_entries")
            .select("*, tournaments(difficulty, end_time, is_closed)")
            .eq("player_wallet", wallet)
            .order("created_at", { ascending: false })
            .limit(10),
        ]);

      if (!player) return sendNotFound(reply, "Player");

      return sendSuccess(reply, {
        player,
        puzzles: puzzles ?? [],
        tournament_entries: entries ?? [],
      });
    } catch (error) {
      return handleApiError(reply, error, "AdminController.getPlayerLookup");
    }
  }

  /**
   * POST /admin/prepare-withdraw-treasury
   * Allows the configured Treasury wallet to withdraw USDC to any destination.
   */
  static async prepareWithdrawTreasury(req: FastifyRequest, reply: FastifyReply) {
    try {
      const authorityWallet = (req as any).adminWallet as string;
      const body = withdrawTreasurySchema.parse(req.body);

      const authorityPubkey = new PublicKey(authorityWallet);
      const destinationPubkey = new PublicKey(body.destination_wallet);
      const tokenMintPubkey = new PublicKey(body.token_mint);

      const gameRef = await fetchGame();
      if (!gameRef) return sendError(reply, "Game ref not found.", 404);

      if (gameRef.treasury !== authorityWallet) {
        return sendError(reply, "Only the active Game Treasury wallet can withdraw funds.", 403);
      }

      const mintInfo = await connection.getAccountInfo(tokenMintPubkey);
      if (!mintInfo) return sendError(reply, "Mint not found.", 404);
      const tokenProgramId = mintInfo.owner;

      const treasuryTokenAccount = await getAssociatedTokenAddress(
        tokenMintPubkey,
        authorityPubkey,
        true,
        tokenProgramId
      );

      const destinationTokenAccount = await getAssociatedTokenAddress(
        tokenMintPubkey,
        destinationPubkey,
        false,
        tokenProgramId
      );

      const instructions = [];

      try {
        await getAccount(connection, destinationTokenAccount, "confirmed", tokenProgramId);
      } catch (err: any) {
        if (err instanceof TokenAccountNotFoundError || err.name === "TokenAccountNotFoundError" || err.name === "TokenInvalidAccountOwnerError") {
          instructions.push(
            createAssociatedTokenAccountInstruction(
              authorityPubkey,
              destinationTokenAccount,
              destinationPubkey,
              tokenMintPubkey,
              tokenProgramId
            )
          );
        }
      }

      const amountLamports = Math.floor(body.amount_usdc * 1_000_000);

      const transferIx = createTransferInstruction(
        treasuryTokenAccount,
        destinationTokenAccount,
        authorityPubkey,
        amountLamports,
        [],
        tokenProgramId
      );

      instructions.push(transferIx);

      const result = await buildUnsignedTx(instructions, authorityPubkey);
      return sendSuccess(reply, result);
    } catch (error) {
      return handleApiError(reply, error, "AdminController.prepareWithdrawTreasury");
    }
  }
}
import { z } from "zod";

// ─── Auth / User ──────────────────────────────────────────────────────────────
export const syncUserSchema = z.object({
  token: z.string().min(1, "Privy token is required"),
  username: z.string().min(2).max(30).optional(),
});

export const updateProfileSchema = z.object({
  token: z.string().min(1),
  username: z.string().min(2).max(30).optional(),
  avatar_url: z.string().url().optional(),
});

// ─── Puzzle ───────────────────────────────────────────────────────────────────
export const puzzleResultSchema = z.object({
  puzzle_board: z.string().min(32, "Invalid puzzle board pubkey"),
  puzzle_stats: z.string().min(32, "Invalid puzzle stats pubkey"),
  tx_signature: z.string().min(1, "Transaction signature required"),
});

// ─── Tournament ───────────────────────────────────────────────────────────────
export const tournamentQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  difficulty: z.coerce.number().int().min(0).max(2).optional(),
  active_only: z.coerce.boolean().default(false),
});

// ─── Leaderboard ─────────────────────────────────────────────────────────────
export const leaderboardQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const difficultyParamSchema = z.object({
  difficulty: z.coerce.number().int().min(0).max(2),
});

// ─── Wallet Param ─────────────────────────────────────────────────────────────
export const walletParamSchema = z.object({
  wallet: z.string().min(32).max(44),
});

// ─── Tournament ID Param ──────────────────────────────────────────────────────
export const tournamentIdParamSchema = z.object({
  id: z.string().min(1),
});

// ─── History Query ────────────────────────────────────────────────────────────
export const historyQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// ─── Player Account Update ────────────────────────────────────────────────
export const playerAccountUpdateSchema = z.object({
  player_account_pubkey: z.string().min(32).max(44),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
export type SyncUserInput = z.infer<typeof syncUserSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type PuzzleResultInput = z.infer<typeof puzzleResultSchema>;
export type TournamentQueryInput = z.infer<typeof tournamentQuerySchema>;

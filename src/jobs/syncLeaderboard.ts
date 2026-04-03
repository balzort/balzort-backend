import cron from "node-cron";
import { supabase } from "../config/supabase.js";
import { LeaderboardModel } from "../models/Leaderboard.js";
import { CRON } from "../utils/constants.js";

/**
 * Every 2 minutes: recompute the leaderboard by querying puzzle_results
 * and aggregating per-player stats for each difficulty tier and global.
 */
export function startSyncLeaderboard(): void {
  cron.schedule(CRON.SYNC_LEADERBOARD, async () => {
    try {
      await recomputeTier(null);   // global
      await recomputeTier(0);      // easy
      await recomputeTier(1);      // medium
      await recomputeTier(2);      // hard
      console.log("[syncLeaderboard] All tiers recomputed.");
    } catch (err: any) {
      console.error("[syncLeaderboard] Error:", err.message);
    }
  });

  console.log("✅ Cron: syncLeaderboard registered (every 2 min)");
}

async function recomputeTier(difficulty: number | null): Promise<void> {
  // Build per-player aggregates from puzzle_results
  let query = supabase
    .from("puzzle_results")
    .select("player_wallet, final_score, difficulty")
    .eq("is_solved", true);

  if (difficulty !== null) {
    query = query.eq("difficulty", difficulty);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data || data.length === 0) return;

  // Aggregate by player
  const aggregates = new Map<
    string,
    { total_solved: number; best_score: number; score_sum: number }
  >();

  for (const row of data) {
    const existing = aggregates.get(row.player_wallet) ?? {
      total_solved: 0,
      best_score: 0,
      score_sum: 0,
    };
    existing.total_solved++;
    existing.best_score = Math.max(existing.best_score, row.final_score);
    existing.score_sum += row.final_score;
    aggregates.set(row.player_wallet, existing);
  }

  // Sort by best_score desc
  const sorted = Array.from(aggregates.entries()).sort(
    ([, a], [, b]) => b.best_score - a.best_score
  );

  // Fetch player usernames/avatars
  const wallets = sorted.map(([w]) => w);
  const { data: players } = await supabase
    .from("players")
    .select("embedded_wallet_address, wallet_address, username, avatar_url")
    .in("embedded_wallet_address", wallets);

  const playerMap = new Map<string, any>();
  for (const p of players ?? []) {
    const key = p.embedded_wallet_address ?? p.wallet_address;
    if (key) playerMap.set(key, p);
  }

  // Build leaderboard rows
  const rows = sorted.map(([wallet, agg], idx) => {
    const player = playerMap.get(wallet);
    return {
      difficulty: difficulty,
      rank: idx + 1,
      player_wallet: wallet,
      username: player?.username ?? null,
      avatar_url: player?.avatar_url ?? null,
      total_solved: agg.total_solved,
      best_score: agg.best_score,
      avg_score: Math.round(agg.score_sum / agg.total_solved),
      updated_at: new Date().toISOString(),
    };
  });

  // Atomic: clear + re-insert
  await LeaderboardModel.clearTier(difficulty);
  await LeaderboardModel.bulkUpsert(rows);
}

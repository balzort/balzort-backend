import { supabase } from "../config/supabase.js";

export interface LeaderboardRow {
  id: string;
  player_wallet: string;
  username: string | null;
  avatar_url: string | null;
  difficulty: number | null; // null = global
  total_solved: number;
  best_score: number;
  avg_score: number;
  rank: number;
  updated_at: string;
}

export const LeaderboardModel = {
  async getGlobal(
    limit = 20,
    offset = 0
  ): Promise<{ entries: LeaderboardRow[]; total: number }> {
    const { data, error, count } = await supabase
      .from("leaderboard")
      .select("*", { count: "exact" })
      .is("difficulty", null)
      .order("rank", { ascending: true })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return { entries: (data ?? []) as LeaderboardRow[], total: count ?? 0 };
  },

  async getByDifficulty(
    difficulty: number,
    limit = 20,
    offset = 0
  ): Promise<{ entries: LeaderboardRow[]; total: number }> {
    const { data, error, count } = await supabase
      .from("leaderboard")
      .select("*", { count: "exact" })
      .eq("difficulty", difficulty)
      .order("rank", { ascending: true })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return { entries: (data ?? []) as LeaderboardRow[], total: count ?? 0 };
  },

  /**
   * Rebuild leaderboard from puzzle_results — called by cron job.
   * Uses a Supabase RPC function for atomic rebuild.
   */
  async rebuild(): Promise<void> {
    const { error } = await supabase.rpc("rebuild_leaderboard");
    if (error) {
      // Fallback: manual rebuild
      console.warn("[LeaderboardModel] RPC rebuild failed, using manual rebuild:", error.message);
      await LeaderboardModel.manualRebuild();
    }
  },

  async manualRebuild(): Promise<void> {
    // Build global leaderboard from puzzle_results
    const { data: globalData, error: globalError } = await supabase
      .from("puzzle_results")
      .select("player_wallet, final_score")
      .eq("is_abandoned", false)
      .order("final_score", { ascending: false });

    if (globalError) throw globalError;

    // Aggregate per wallet
    const aggregated = new Map<
      string,
      { total: number; best: number; sum: number }
    >();
    for (const row of globalData ?? []) {
      const existing = aggregated.get(row.player_wallet) ?? {
        total: 0,
        best: 0,
        sum: 0,
      };
      existing.total++;
      existing.best = Math.max(existing.best, row.final_score);
      existing.sum += row.final_score;
      aggregated.set(row.player_wallet, existing);
    }

    // Sort by best_score desc
    const sorted = [...aggregated.entries()].sort(
      (a, b) => b[1].best - a[1].best
    );

    // Upsert leaderboard rows
    const rows = sorted.map(([wallet, stats], idx) => ({
      player_wallet: wallet,
      difficulty: null,
      total_solved: stats.total,
      best_score: stats.best,
      avg_score: Math.round(stats.sum / stats.total),
      rank: idx + 1,
      updated_at: new Date().toISOString(),
    }));

    if (rows.length > 0) {
      const { error } = await supabase
        .from("leaderboard")
        .upsert(rows, { onConflict: "player_wallet,difficulty" });
      if (error) throw error;
    }
  },

  /**
   * Delete all leaderboard rows for a given difficulty tier.
   * Pass null for the global tier.
   */
  async clearTier(difficulty: number | null): Promise<void> {
    let query = supabase.from("leaderboard").delete();
    if (difficulty === null) {
      query = query.is("difficulty", null);
    } else {
      query = query.eq("difficulty", difficulty);
    }
    const { error } = await query;
    if (error) throw error;
  },

  /**
   * Bulk upsert leaderboard rows.
   */
  async bulkUpsert(rows: Record<string, unknown>[]): Promise<void> {
    if (rows.length === 0) return;
    const { error } = await supabase
      .from("leaderboard")
      .upsert(rows, { onConflict: "player_wallet,difficulty" });
    if (error) throw error;
  },
};
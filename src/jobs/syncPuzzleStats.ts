import cron from "node-cron";
import { supabase } from "../config/supabase.js";
import { PuzzleResultModel } from "../models/PuzzleResult.js";
import { PlayerModel } from "../models/Player.js";
import { fetchPuzzleStatsByAddress } from "../solana/accounts/fetchPuzzleStats.js";
import { CRON, PUZZLE_STATUS } from "../utils/constants.js";

/**
 * Every 30 seconds: find any puzzle_results rows that have missing data
 * (e.g., no final_score because the tx came in before the finalize),
 * and backfill them by re-reading the on-chain PuzzleStats account.
 *
 * Also catches cases where the frontend didn't call /puzzles/result but
 * the Helius webhook did fire and created a partial record.
 */
export function startSyncPuzzleStats(): void {
  cron.schedule(CRON.SYNC_PUZZLE_STATS, async () => {
    try {
      // Find recently created results that may be missing final_score
      const { data: incomplete } = await supabase
        .from("puzzle_results")
        .select("*")
        .eq("final_score", 0)
        .eq("is_abandoned", false)
        .eq("is_solved", false)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!incomplete || incomplete.length === 0) return;

      let fixed = 0;

      await Promise.allSettled(
        incomplete.map(async (row: any) => {
          const statsAccount = await fetchPuzzleStatsByAddress(
            row.puzzle_stats_pubkey
          );

          if (!statsAccount) return;

          const isFinalized =
            statsAccount.status === PUZZLE_STATUS.FINALIZED ||
            statsAccount.status === PUZZLE_STATUS.SOLVED;

          if (!isFinalized) return;

          const elapsedSecs =
            statsAccount.completedAt > 0
              ? statsAccount.completedAt - statsAccount.startedAt
              : 0;

          const { error } = await supabase
            .from("puzzle_results")
            .update({
              move_count: statsAccount.moveCount,
              undo_count: statsAccount.undoCount,
              elapsed_secs: elapsedSecs,
              final_score: Number(statsAccount.finalScore),
              is_solved: statsAccount.isSolved,
            })
            .eq("id", row.id);

          if (error) {
            console.error("[syncPuzzleStats] Update error:", error.message);
            return;
          }

          if (statsAccount.isSolved && row.final_score === 0) {
            await PlayerModel.incrementSolved(
              row.player_wallet,
              Number(statsAccount.finalScore)
            );
          }

          fixed++;
        })
      );

      if (fixed > 0) {
        console.log(`[syncPuzzleStats] Fixed ${fixed} incomplete results.`);
      }
    } catch (err: any) {
      console.error("[syncPuzzleStats] Error:", err.message);
    }
  });

  console.log("✅ Cron: syncPuzzleStats registered (every 30s)");
}

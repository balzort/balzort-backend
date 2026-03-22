/**
 * onPuzzleAbandoned
 * ─────────────────────────────────────────────────────────────
 * PuzzleStats accounts are closed after the puzzle ends.
 * We always log activity from event data and treat the account
 * fetch as optional enrichment.
 */

import { PuzzleResultModel } from "../../models/PuzzleResult.js";
import { ActivityModel } from "../../models/Activity.js";
import { fetchPuzzleStatsByAddress } from "../../solana/accounts/fetchPuzzleStats.js";
import { WebSocketService } from "../../services/websocket.service.js";
import { WS_EVENTS } from "../../utils/constants.js";

export async function onPuzzleAbandoned(
  event: any,
  sig: string,
  timestamp: number
): Promise<void> {
  const data = event.data;

  const playerWallet       = data.player?.toString();
  const puzzleStatsAddress = (data.puzzle_stats ?? data.puzzleStats)?.toString();
  const puzzleBoardAddress = (data.puzzle_board ?? data.puzzleBoard)?.toString();

  if (!playerWallet || !puzzleStatsAddress) {
    console.warn("[onPuzzleAbandoned] Missing accounts in event data:", sig);
    return;
  }

  // ── Idempotency ─────────────────────────────────────────────
  const alreadyProcessed = await ActivityModel.alreadyProcessed(sig, "puzzle_abandoned");
  if (alreadyProcessed) return;

  // ── On-chain account (best-effort) ──────────────────────────
  const statsAccount = await fetchPuzzleStatsByAddress(puzzleStatsAddress);

  if (!statsAccount) {
    console.log(
      `[onPuzzleAbandoned] PuzzleStats account closed (normal for backfill): ${puzzleStatsAddress.slice(0, 8)}...`
    );
  }

  // ── Puzzle result (only when we have full account data) ─────
  if (statsAccount) {
    const exists = await PuzzleResultModel.existsByStatsAccount(puzzleStatsAddress);

    if (!exists) {
      await PuzzleResultModel.create({
        player_wallet:       playerWallet,
        puzzle_board_pubkey: puzzleBoardAddress ?? puzzleStatsAddress,
        puzzle_stats_pubkey: puzzleStatsAddress,
        difficulty:          statsAccount.difficulty,
        num_tubes:           statsAccount.numTubes,
        balls_per_tube:      statsAccount.ballsPerTube,
        move_count:          statsAccount.moveCount,
        undo_count:          statsAccount.undoCount,
        elapsed_secs:        0,
        final_score:         0,
        is_abandoned:        true,
        is_solved:           false,
        tx_signature:        sig,
      });
    }
  }

  // ── Activity log — ALWAYS runs ───────────────────────────────
  const difficulty = statsAccount?.difficulty ?? Number(data.difficulty ?? 0);
  const moveCount  = statsAccount?.moveCount  ?? Number(data.move_count ?? data.moveCount ?? 0);
  const undoCount  = statsAccount?.undoCount  ?? Number(data.undo_count ?? data.undoCount ?? 0);

  await ActivityModel.log({
    event_type:          "puzzle_abandoned",
    player_wallet:       playerWallet,
    puzzle_board_pubkey: puzzleBoardAddress,
    puzzle_stats_pubkey: puzzleStatsAddress,
    tx_signature:        sig,
    block_time:          timestamp,
    raw_data: {
      difficulty,
      move_count:        moveCount,
      undo_count:        undoCount,
      account_available: !!statsAccount,
    },
  });

  WebSocketService.broadcast(WS_EVENTS.PUZZLE_ABANDONED, {
    player:     playerWallet,
    difficulty,
    move_count: moveCount,
  });

  console.log(
    `[onPuzzleAbandoned] ${playerWallet.slice(0, 8)}... | account=${statsAccount ? "✓" : "closed"}`
  );
}
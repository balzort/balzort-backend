/**
 * onPuzzleFinalized
 * ─────────────────────────────────────────────────────────────
 * Key fix: PuzzleStats accounts are closed (rent reclaimed) after
 * finalization. During a backfill the account will NOT exist anymore.
 * We now ALWAYS log to the activity table using event data as the
 * authoritative source; on-chain account data is used as an enrichment
 * when available (e.g. for fresh live events) but is never required.
 */

import { PuzzleResultModel } from "../../models/PuzzleResult.js";
import { PlayerModel } from "../../models/Player.js";
import { ActivityModel } from "../../models/Activity.js";
import { fetchPuzzleStatsByAddress } from "../../solana/accounts/fetchPuzzleStats.js";
import { WebSocketService } from "../../services/websocket.service.js";
import { WS_EVENTS } from "../../utils/constants.js";

export async function onPuzzleFinalized(
  event: any,
  sig: string,
  timestamp: number
): Promise<void> {
  const data = event.data;

  // Anchor IDL parser may give camelCase or snake_case depending on version
  const puzzleStatsAddress  = (data.puzzle_stats  ?? data.puzzleStats)?.toString();
  const puzzleBoardAddress  = (data.puzzle_board  ?? data.puzzleBoard)?.toString();
  const playerWallet        = data.player?.toString();

  if (!puzzleStatsAddress || !playerWallet) {
    console.warn("[onPuzzleFinalized] Missing puzzle_stats or player in event:", sig);
    return;
  }

  // ── Idempotency ─────────────────────────────────────────────
  const alreadyProcessed = await ActivityModel.alreadyProcessed(sig, "puzzle_finalized");
  if (alreadyProcessed) return;

  // ── On-chain account (best-effort) ──────────────────────────
  // The account may already be closed by the time we process this
  // event during a backfill — that is normal and expected.
  const statsAccount = await fetchPuzzleStatsByAddress(puzzleStatsAddress);

  if (!statsAccount) {
    console.log(
      `[onPuzzleFinalized] PuzzleStats account closed (normal for backfill): ${puzzleStatsAddress.slice(0, 8)}...`
    );
  }

  // ── Puzzle result (only when we have full account data) ─────
  // We need num_tubes, balls_per_tube, final_score, is_solved from
  // the account — these are not available in the event payload.
  if (statsAccount) {
    const exists = await PuzzleResultModel.existsByStatsAccount(puzzleStatsAddress);

    if (!exists) {
      const elapsedSecs =
        statsAccount.completedAt > 0
          ? statsAccount.completedAt - statsAccount.startedAt
          : 0;

      await PuzzleResultModel.create({
        player_wallet:      playerWallet,
        puzzle_board_pubkey: puzzleBoardAddress ?? puzzleStatsAddress,
        puzzle_stats_pubkey: puzzleStatsAddress,
        difficulty:         statsAccount.difficulty,
        num_tubes:          statsAccount.numTubes,
        balls_per_tube:     statsAccount.ballsPerTube,
        move_count:         statsAccount.moveCount,
        undo_count:         statsAccount.undoCount,
        elapsed_secs:       elapsedSecs,
        final_score:        Number(statsAccount.finalScore),
        is_abandoned:       false,
        is_solved:          statsAccount.isSolved,
        tx_signature:       sig,
      });

      if (statsAccount.isSolved) {
        await PlayerModel.incrementSolved(playerWallet, Number(statsAccount.finalScore));
      }
    }
  }

  // ── Activity log — ALWAYS runs ───────────────────────────────
  // Use on-chain data when available; fall back to event payload.
  const difficulty  = statsAccount?.difficulty  ?? Number(data.difficulty  ?? 0);
  const moveCount   = statsAccount?.moveCount   ?? Number(data.move_count  ?? data.moveCount  ?? 0);
  const undoCount   = statsAccount?.undoCount   ?? Number(data.undo_count  ?? data.undoCount  ?? 0);
  const finalScore  = statsAccount?.finalScore  ?? BigInt(0);
  const isSolved    = statsAccount?.isSolved    ?? null;

  await ActivityModel.log({
    event_type:          "puzzle_finalized",
    player_wallet:       playerWallet,
    puzzle_board_pubkey: puzzleBoardAddress ?? "",
    puzzle_stats_pubkey: puzzleStatsAddress,
    tx_signature:        sig,
    block_time:          timestamp,
    raw_data: {
      difficulty,
      move_count:       moveCount,
      undo_count:       undoCount,
      final_score:      finalScore.toString(),
      is_solved:        isSolved,
      account_available: !!statsAccount,
    },
  });

  // ── WebSocket broadcast (live events only) ──────────────────
  if (statsAccount?.isSolved) {
    const elapsedSecs =
      statsAccount.completedAt > 0
        ? statsAccount.completedAt - statsAccount.startedAt
        : 0;

    WebSocketService.broadcast(WS_EVENTS.PUZZLE_SOLVED, {
      player:      playerWallet,
      difficulty:  statsAccount.difficulty,
      score:       Number(statsAccount.finalScore),
      move_count:  statsAccount.moveCount,
      elapsed_secs: elapsedSecs,
    });
  }

  console.log(
    `[onPuzzleFinalized] ${playerWallet.slice(0, 8)}... | score=${finalScore} | account=${statsAccount ? "✓" : "closed"}`
  );
}
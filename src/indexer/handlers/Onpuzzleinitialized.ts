import { ActivityModel } from "../../models/Activity.js";

/**
 * onPuzzleInitialized
 * Event fields (events.rs):
 *   player, puzzle_board, puzzle_stats, num_tubes, balls_per_tube, difficulty
 */
export async function onPuzzleInitialized(
  event: any,
  sig: string,
  timestamp: number
): Promise<void> {
  const data = event.data;

  const playerWallet       = data.player?.toString();
  const puzzleBoardAddress = (data.puzzle_board ?? data.puzzleBoard)?.toString();
  const puzzleStatsAddress = (data.puzzle_stats ?? data.puzzleStats)?.toString();
  const difficulty         = Number(data.difficulty ?? 0);
  const numTubes           = Number(data.num_tubes  ?? data.numTubes  ?? 0);
  const ballsPerTube       = Number(data.balls_per_tube ?? data.ballsPerTube ?? 0);

  if (!playerWallet) {
    console.warn("[onPuzzleInitialized] Missing player in event:", sig);
    return;
  }

  const alreadyProcessed = await ActivityModel.alreadyProcessed(sig, "puzzle_initialized");
  if (alreadyProcessed) return;

  await ActivityModel.log({
    event_type:          "puzzle_initialized",
    player_wallet:       playerWallet,
    puzzle_board_pubkey: puzzleBoardAddress,
    puzzle_stats_pubkey: puzzleStatsAddress,
    tx_signature:        sig,
    block_time:          timestamp,
    raw_data: { difficulty, num_tubes: numTubes, balls_per_tube: ballsPerTube },
  });

  console.log(`[onPuzzleInitialized] ${playerWallet.slice(0, 8)}... difficulty=${difficulty}`);
}
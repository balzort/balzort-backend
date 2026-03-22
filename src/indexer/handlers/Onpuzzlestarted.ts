import { ActivityModel } from "../../models/Activity.js";

/**
 * onPuzzleStarted
 * Event fields (events.rs): puzzle_board, player
 */
export async function onPuzzleStarted(
  event: any,
  sig: string,
  timestamp: number
): Promise<void> {
  const data = event.data;

  const playerWallet       = data.player?.toString();
  const puzzleBoardAddress = (data.puzzle_board ?? data.puzzleBoard)?.toString();

  if (!playerWallet) {
    console.warn("[onPuzzleStarted] Missing player in event:", sig);
    return;
  }

  const alreadyProcessed = await ActivityModel.alreadyProcessed(sig, "puzzle_started");
  if (alreadyProcessed) return;

  await ActivityModel.log({
    event_type:          "puzzle_started",
    player_wallet:       playerWallet,
    puzzle_board_pubkey: puzzleBoardAddress,
    tx_signature:        sig,
    block_time:          timestamp,
    raw_data:            { puzzle_board: puzzleBoardAddress },
  });

  console.log(`[onPuzzleStarted] ${playerWallet.slice(0, 8)}...`);
}
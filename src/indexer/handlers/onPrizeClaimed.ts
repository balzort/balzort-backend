import { TournamentEntryModel } from "../../models/TournamentEntry.js";
import { ActivityModel } from "../../models/Activity.js";
import { WebSocketService } from "../../services/websocket.service.js";
import { WS_EVENTS } from "../../utils/constants.js";

export async function onPrizeClaimed(
  event: any,
  sig: string,
  timestamp: number
): Promise<void> {
  const data = event.data;

  const playerWallet      = data.player?.toString();
  const tournamentAddress = data.tournament?.toString();
  const prizeAmount       = Number(data.amount ?? 0);

  if (!playerWallet || !tournamentAddress) {
    console.warn("[onPrizeClaimed] Missing accounts in event:", sig);
    return;
  }

  // ── Idempotency ─────────────────────────────────────────────
  const alreadyProcessed = await ActivityModel.alreadyProcessed(sig, "prize_claimed");
  if (alreadyProcessed) return;

  // ── DB update (best-effort) ──────────────────────────────────
  try {
    await TournamentEntryModel.markClaimed(
      tournamentAddress,
      playerWallet,
      prizeAmount.toString()
    );
  } catch (dbErr: any) {
    console.error(`[onPrizeClaimed] markClaimed error (non-fatal): ${dbErr.message}`);
  }

  // ── Activity log — ALWAYS runs ───────────────────────────────
  await ActivityModel.log({
    event_type:         "prize_claimed",
    player_wallet:      playerWallet,
    tournament_address: tournamentAddress,
    tx_signature:       sig,
    block_time:         timestamp,
    raw_data:           { prize_amount: prizeAmount },
  });

  WebSocketService.broadcast(WS_EVENTS.PRIZE_CLAIMED, {
    tournament: tournamentAddress,
    player:     playerWallet,
    amount:     prizeAmount,
  });

  console.log(
    `[onPrizeClaimed] ${playerWallet.slice(0, 8)}... claimed ${prizeAmount} lamports`
  );
}
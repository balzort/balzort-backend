/**
 * onTournamentResultRecorded
 * ─────────────────────────────────────────────────────────────
 * Bug fix: the event itself contains weight, elapsed_secs, and
 * move_count — we no longer pass hardcoded 0s to markCompleted.
 *
 * Event fields (from events.rs):
 *   tournament: Pubkey
 *   player:     Pubkey
 *   weight:     u128
 *   elapsed_secs: u64
 *   move_count:   u32
 */

import { TournamentEntryModel } from "../../models/TournamentEntry.js";
import { TournamentModel } from "../../models/Tournament.js";
import { ActivityModel } from "../../models/Activity.js";
import { fetchTournamentByAddress } from "../../solana/accounts/fetchTournament.js";

export async function onTournamentResultRecorded(
  event: any,
  sig: string,
  timestamp: number
): Promise<void> {
  const data = event.data;

  const playerWallet      = data.player?.toString();
  const tournamentAddress = data.tournament?.toString();

  if (!playerWallet || !tournamentAddress) {
    console.warn("[onTournamentResultRecorded] Missing accounts in event:", sig);
    return;
  }

  // ── Idempotency ─────────────────────────────────────────────
  const alreadyProcessed = await ActivityModel.alreadyProcessed(sig, "tournament_result_recorded");
  if (alreadyProcessed) return;

  // ── Read values from the event (authoritative source) ────────
  // The IDL parser may use camelCase or snake_case depending on version.
  const parimutuelWeight = (data.weight ?? data.parimutuelWeight)?.toString() ?? "0";
  const elapsedSecs      = Number(data.elapsed_secs ?? data.elapsedSecs ?? 0);
  const moveCount        = Number(data.move_count   ?? data.moveCount   ?? 0);

  // ── DB updates (best-effort) ─────────────────────────────────
  try {
    await TournamentEntryModel.markCompleted(
      tournamentAddress,
      playerWallet,
      elapsedSecs,     // ← was always 0 before; now from event
      moveCount,       // ← was always 0 before; now from event
      parimutuelWeight
    );
  } catch (dbErr: any) {
    console.error(`[onTournamentResultRecorded] markCompleted error (non-fatal): ${dbErr.message}`);
  }

  try {
    const tournamentData = await fetchTournamentByAddress(tournamentAddress);

    if (tournamentData) {
      await TournamentModel.upsert({
        on_chain_address:  tournamentAddress,
        on_chain_id:       tournamentData.tournamentId.toString(),
        authority:         tournamentData.authority,
        entry_fee:         tournamentData.entryFee.toString(),
        prize_pool:        tournamentData.prizePool.toString(),
        net_prize_pool:    tournamentData.netPrizePool.toString(),
        treasury_fee_bps:  tournamentData.treasuryFeeBps,
        difficulty:        tournamentData.difficulty,
        start_time:        tournamentData.startTime,
        end_time:          tournamentData.endTime,
        total_entries:     tournamentData.totalEntries,
        total_completers:  tournamentData.totalCompleters,
        cumulative_weight: tournamentData.cumulativeWeight.toString(),
        is_closed:         tournamentData.isClosed,
      });
    }
  } catch (dbErr: any) {
    console.error(`[onTournamentResultRecorded] tournament upsert error (non-fatal): ${dbErr.message}`);
  }

  // ── Activity log — ALWAYS runs ───────────────────────────────
  await ActivityModel.log({
    event_type:         "tournament_result_recorded",
    player_wallet:      playerWallet,
    tournament_address: tournamentAddress,
    tx_signature:       sig,
    block_time:         timestamp,
    raw_data: {
      parimutuel_weight: parimutuelWeight,
      elapsed_secs:      elapsedSecs,
      move_count:        moveCount,
    },
  });

  console.log(
    `[onTournamentResultRecorded] ${playerWallet.slice(0, 8)}... | elapsed=${elapsedSecs}s moves=${moveCount}`
  );
}
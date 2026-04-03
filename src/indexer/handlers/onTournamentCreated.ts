/**
 * onTournamentCreated
 * ─────────────────────────────────────────────────────────────
 * Tournament accounts can be closed after prize distribution.
 * Activity is always logged using event data as fallback.
 */

import { TournamentModel } from "../../models/Tournament.js";
import { ActivityModel } from "../../models/Activity.js";
import { fetchTournamentByAddress } from "../../solana/accounts/fetchTournament.js";
import { WebSocketService } from "../../services/websocket.service.js";
import { WS_EVENTS } from "../../utils/constants.js";

export async function onTournamentCreated(
  event: any,
  sig: string,
  timestamp: number
): Promise<void> {
  const data = event.data;

  const tournamentAddress = data.tournament?.toString();

  if (!tournamentAddress) {
    console.warn("[onTournamentCreated] Missing tournament address in event:", sig);
    return;
  }

  // ── Idempotency ─────────────────────────────────────────────
  const alreadyProcessed = await ActivityModel.alreadyProcessed(sig, "tournament_created");
  if (alreadyProcessed) return;

  // ── On-chain account (best-effort) ──────────────────────────
  const tournamentData = await fetchTournamentByAddress(tournamentAddress);

  if (tournamentData) {
    await TournamentModel.upsert({
      on_chain_address:   tournamentAddress,
      on_chain_id:        tournamentData.tournamentId.toString(),
      authority:          tournamentData.authority,
      entry_fee:          tournamentData.entryFee.toString(),
      prize_pool:         tournamentData.prizePool.toString(),
      net_prize_pool:     tournamentData.netPrizePool.toString(),
      treasury_fee_bps:   tournamentData.treasuryFeeBps,
      difficulty:         tournamentData.difficulty,
      num_tubes:          tournamentData.numTubes,
      balls_per_tube:     tournamentData.ballsPerTube,
      start_time:         tournamentData.startTime,
      end_time:           tournamentData.endTime,
      total_entries:      tournamentData.totalEntries,
      total_completers:   tournamentData.totalCompleters,
      cumulative_weight:  tournamentData.cumulativeWeight.toString(),
      is_closed:          tournamentData.isClosed,
    });
  } else {
    console.log(
      `[onTournamentCreated] Tournament account not found (may be closed): ${tournamentAddress.slice(0, 8)}...`
    );
  }

  // ── Activity log — ALWAYS runs ───────────────────────────────
  // Event payload contains: tournament, entry_fee, difficulty, end_time, treasury_fee_bps
  const difficulty = tournamentData?.difficulty  ?? Number(data.difficulty ?? 0);
  const entryFee   = tournamentData?.entryFee.toString()
    ?? (data.entry_fee ?? data.entryFee)?.toString()
    ?? "0";
  const endTime    = tournamentData?.endTime
    ?? Number(data.end_time ?? data.endTime ?? 0);

  await ActivityModel.log({
    event_type:         "tournament_created",
    tournament_address: tournamentAddress,
    tx_signature:       sig,
    block_time:         timestamp,
    raw_data: {
      difficulty,
      entry_fee:         entryFee,
      end_time:          endTime,
      account_available: !!tournamentData,
    },
  });

  WebSocketService.broadcast(WS_EVENTS.TOURNAMENT_CREATED, {
    tournament: tournamentAddress,
    difficulty,
    entry_fee:  entryFee,
    end_time:   endTime,
  });

  console.log(
    `[onTournamentCreated] ${tournamentAddress.slice(0, 8)}... | account=${tournamentData ? "✓" : "closed"}`
  );
}
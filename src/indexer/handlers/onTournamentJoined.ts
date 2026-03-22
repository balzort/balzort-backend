/**
 * onTournamentJoined
 * ─────────────────────────────────────────────────────────────
 * Schema fix: TournamentEntryModel.upsert now receives the correct
 * field names (on_chain_entry_address, tournament_address) that
 * match the updated DB schema (see migration.sql).
 *
 * Activity is always logged regardless of whether on-chain data
 * or the DB tournament record is available.
 */

import { TournamentModel } from "../../models/Tournament.js";
import { TournamentEntryModel } from "../../models/TournamentEntry.js";
import { ActivityModel } from "../../models/Activity.js";
import { fetchTournamentByAddress } from "../../solana/accounts/fetchTournament.js";
import { fetchTournamentEntry } from "../../solana/accounts/fetchTournamentEntry.js";
import { WebSocketService } from "../../services/websocket.service.js";
import { WS_EVENTS } from "../../utils/constants.js";

export async function onTournamentJoined(
  event: any,
  sig: string,
  timestamp: number
): Promise<void> {
  const data = event.data;

  const playerWallet      = data.player?.toString();
  const tournamentAddress = data.tournament?.toString();

  if (!playerWallet || !tournamentAddress) {
    console.warn("[onTournamentJoined] Missing accounts in event:", sig);
    return;
  }

  // ── Idempotency ─────────────────────────────────────────────
  const alreadyProcessed = await ActivityModel.alreadyProcessed(sig, "tournament_joined");
  if (alreadyProcessed) return;

  // ── On-chain accounts (best-effort) ─────────────────────────
  const [entryData, tournamentData] = await Promise.all([
    fetchTournamentEntry(tournamentAddress, playerWallet),
    fetchTournamentByAddress(tournamentAddress),
  ]);

  // ── DB upserts (best-effort — failures don't block activity log) ──
  try {
    if (tournamentData) {
      // Keep tournament in sync
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

    if (entryData) {
      const dbTournament = await TournamentModel.findByOnChainAddress(tournamentAddress);

      if (dbTournament) {
        await TournamentEntryModel.upsert({
          tournament_id:          dbTournament.id,
          on_chain_entry_address: entryData.address,       // ← fixed field name
          tournament_address:     tournamentAddress,        // ← fixed field name
          player_wallet:          playerWallet,
          entry_deposit:          entryData.entryDeposit.toString(),
          parimutuel_weight:      entryData.parimutuelWeight.toString(),
          completed:              entryData.completed,
          has_claimed:            entryData.hasClaimed,
        });
      } else {
        console.warn(
          `[onTournamentJoined] Tournament not in DB yet — entry not recorded for ${tournamentAddress.slice(0, 8)}...`
        );
      }
    }
  } catch (dbErr: any) {
    // Log the error but continue so activity is always saved
    console.error(`[onTournamentJoined] DB upsert error (non-fatal): ${dbErr.message}`);
  }

  // ── Activity log — ALWAYS runs ───────────────────────────────
  const entryDeposit = entryData?.entryDeposit.toString()
    ?? (data.entry_fee ?? data.entryFee)?.toString()
    ?? "0";

  await ActivityModel.log({
    event_type:         "tournament_joined",
    player_wallet:      playerWallet,
    tournament_address: tournamentAddress,
    tx_signature:       sig,
    block_time:         timestamp,
    raw_data: {
      entry_deposit:     entryDeposit,
      total_entries:     tournamentData?.totalEntries,
      account_available: !!entryData && !!tournamentData,
    },
  });

  WebSocketService.broadcast(WS_EVENTS.TOURNAMENT_JOINED, {
    tournament:    tournamentAddress,
    player:        playerWallet,
    total_entries: tournamentData?.totalEntries,
  });

  console.log(
    `[onTournamentJoined] ${playerWallet.slice(0, 8)}... → ${tournamentAddress.slice(0, 8)}...`
  );
}
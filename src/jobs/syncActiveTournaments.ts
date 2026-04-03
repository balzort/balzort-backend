import cron from "node-cron";
import { TournamentModel } from "../models/Tournament.js";
import { TournamentEntryModel } from "../models/TournamentEntry.js";
import { fetchTournamentByAddress } from "../solana/accounts/fetchTournament.js";
import { fetchEntriesForTournament } from "../solana/accounts/fetchTournamentEntry.js";
import { CRON } from "../utils/constants.js";
import { processMissingExpectedPrizes } from "./syncMissingPrizes.js";
import { WebSocketService } from "../services/websocket.service.js";

/**
 * Every 1 minute: fetch all open tournaments from DB, then re-read each one
 * from the Solana chain to sync total_entries, prize_pool, is_closed.
 *
 * This is critical because join_tournament and record_tournament_result
 * may not emit events Helius can capture in all cases.
 */
export function startSyncActiveTournaments(): void {
  cron.schedule(CRON.SYNC_TOURNAMENTS, async () => {
    try {
      const openTournaments = await TournamentModel.findUnclosedTournaments();

      if (openTournaments.length === 0) {
        console.log("[syncActiveTournaments] No unclosed tournaments.");
        return;
      }

      let synced = 0;
      let closed = 0;

      await Promise.allSettled(
        openTournaments.map(async (dbTournament) => {
          const onChainData = await fetchTournamentByAddress(
            dbTournament.on_chain_address
          );

          if (!onChainData) {
            console.warn(
              "[syncActiveTournaments] Tournament not found on chain:",
              dbTournament.on_chain_address
            );
            return;
          }

          await TournamentModel.upsert({
            on_chain_address: dbTournament.on_chain_address,
            on_chain_id: onChainData.tournamentId.toString(),
            authority: onChainData.authority,
            entry_fee: onChainData.entryFee.toString(),
            prize_pool: onChainData.prizePool.toString(),
            net_prize_pool: onChainData.netPrizePool.toString(),
            treasury_fee_bps: onChainData.treasuryFeeBps,
            difficulty: onChainData.difficulty,
            num_tubes: onChainData.numTubes,
            balls_per_tube: onChainData.ballsPerTube,
            start_time: onChainData.startTime,
            end_time: onChainData.endTime,
            total_entries: onChainData.totalEntries,
            total_completers: onChainData.totalCompleters,
            cumulative_weight: onChainData.cumulativeWeight.toString(),
            is_closed: onChainData.isClosed,
          });

          // Broadcast to all connected WS clients so frontends update live
          WebSocketService.broadcast(
            onChainData.isClosed ? "tournament_closed" : "tournament_updated",
            {
              on_chain_address: dbTournament.on_chain_address,
              total_entries: onChainData.totalEntries,
              prize_pool: onChainData.prizePool.toString(),
              is_closed: onChainData.isClosed,
            }
          );

          if (onChainData.isClosed) closed++;

          // Sync tournament entries
          try {
            const entries = await fetchEntriesForTournament(dbTournament.on_chain_address);
            for (const entry of entries) {
              await TournamentEntryModel.upsert({
                tournament_id: dbTournament.id,
                on_chain_tournament_id: dbTournament.on_chain_id,
                on_chain_entry_address: entry.address,
                tournament_address: entry.tournament,
                player_account: entry.player,
                entry_deposit: entry.entryDeposit.toString(),
                parimutuel_weight: entry.parimutuelWeight.toString(),
                completed: entry.completed,
                has_claimed: entry.hasClaimed,
              });
            }
          } catch (entryErr: any) {
            console.error(`[syncActiveTournaments] Error syncing entries for ${dbTournament.on_chain_address}:`, entryErr.message);
          }

          synced++;
        })
      );

      console.log(
        `[syncActiveTournaments] Synced ${synced}/${openTournaments.length} tournaments. Newly closed: ${closed}`
      );

      // Layer 2: Trigger sweeping auto-healing
      if (closed > 0) {
         await processMissingExpectedPrizes();
      }

    } catch (err: any) {
      console.error("[syncActiveTournaments] Error:", err.message);
    }
  });

  console.log("✅ Cron: syncActiveTournaments registered (every 1 min)");
}

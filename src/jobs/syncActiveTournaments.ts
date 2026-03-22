import cron from "node-cron";
import { TournamentModel } from "../models/Tournament.js";
import { fetchTournamentByAddress } from "../solana/accounts/fetchTournament.js";
import { CRON } from "../utils/constants.js";

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
      const openTournaments = await TournamentModel.findOpenTournaments();

      if (openTournaments.length === 0) {
        console.log("[syncActiveTournaments] No open tournaments.");
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
            start_time: onChainData.startTime,
            end_time: onChainData.endTime,
            total_entries: onChainData.totalEntries,
            total_completers: onChainData.totalCompleters,
            cumulative_weight: onChainData.cumulativeWeight.toString(),
            is_closed: onChainData.isClosed,
          });

          if (onChainData.isClosed) closed++;
          synced++;
        })
      );

      console.log(
        `[syncActiveTournaments] Synced ${synced}/${openTournaments.length} tournaments. Newly closed: ${closed}`
      );
    } catch (err: any) {
      console.error("[syncActiveTournaments] Error:", err.message);
    }
  });

  console.log("✅ Cron: syncActiveTournaments registered (every 1 min)");
}

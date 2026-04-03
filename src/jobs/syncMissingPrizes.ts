import { TournamentModel } from "../models/Tournament.js";
import { TournamentEntryModel } from "../models/TournamentEntry.js";

/**
 * Sweeps the database for closed tournaments and calculates the expected_prize
 * for any entries that are missing it. This acts as our safety net (Layer 2 & 3)
 * if the real-time indexer misses the TournamentClosed event.
 */
export async function processMissingExpectedPrizes(): Promise<void> {
  console.log("[syncMissingPrizes] Starting sweep for missing expected_prizes...");

  try {
    const closedTournaments = await TournamentModel.findClosedTournaments();
    if (closedTournaments.length === 0) return;

    let updatedEntriesCount = 0;

    for (const t of closedTournaments) {
      const tournamentAddress = t.on_chain_address;
      const entries = await TournamentEntryModel.findByTournament(tournamentAddress);
      
      const missingEntries = entries.filter(e => e.expected_prize === null || e.expected_prize === undefined);
      if (missingEntries.length === 0) continue;

      const cumulativeWeight = BigInt(t.cumulative_weight?.toString() ?? "0");
      const netPrizePool = BigInt(t.net_prize_pool?.toString() ?? "0");
      const totalEntries = BigInt(t.total_entries);

      console.log(`[syncMissingPrizes] Found ${missingEntries.length} missing expected_prizes in Tournament: ${tournamentAddress.slice(0, 8)}...`);

      for (const entry of missingEntries) {
        let expectedAmount = 0n;
        if (cumulativeWeight === 0n) {
          if (totalEntries > 0n) {
            expectedAmount = netPrizePool / totalEntries;
          }
        } else if (entry.completed) {
          const entryWeight = BigInt(entry.parimutuel_weight ?? "0");
          expectedAmount = (entryWeight * netPrizePool) / cumulativeWeight;
        }

        await TournamentEntryModel.updateExpectedPrize(entry.id, expectedAmount.toString());
        updatedEntriesCount++;
      }
    }

    if (updatedEntriesCount > 0) {
      console.log(`[syncMissingPrizes] ✅ Successfully auto-healed and calculated expected limits for ${updatedEntriesCount} entries.`);
    }

  } catch (error: any) {
    console.error("[syncMissingPrizes] Backfill sweep failed:", error.message);
  }
}

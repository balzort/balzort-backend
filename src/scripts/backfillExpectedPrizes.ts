import { TournamentModel } from "../models/Tournament.js";
import { TournamentEntryModel } from "../models/TournamentEntry.js";

async function runBackfill() {
  console.log("Starting backfill for expected_prize on already closed tournaments...");

  try {
    // 1. Fetch all closed tournaments
    const closedTournaments = await TournamentModel.findClosedTournaments();
    console.log(`Found ${closedTournaments.length} totally closed tournaments.`);

    let updatedEntriesCount = 0;

    // 2. Iterate through and process their mapped arrays
    for (const t of closedTournaments) {
      const tournamentAddress = t.on_chain_address;
      
      const entries = await TournamentEntryModel.findByTournament(tournamentAddress);
      const cumulativeWeight = BigInt(t.cumulative_weight?.toString() ?? "0");
      const netPrizePool = BigInt(t.net_prize_pool?.toString() ?? "0");
      const totalEntries = BigInt(t.total_entries);

      console.log(`Processing Tournament: ${tournamentAddress.slice(0, 8)}... (${entries.length} entries)`);

      for (const entry of entries) {
        if (entry.expected_prize !== null && entry.expected_prize !== undefined) {
          // Skip if already processed safely
          continue;
        }

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

    console.log(`\n✅ Backfill completed! Safely retroactively calculated expected limits for ${updatedEntriesCount} entries.`);
    process.exit(0);

  } catch (error) {
    console.error("Backfill failed:", error);
    process.exit(1);
  }
}

runBackfill();

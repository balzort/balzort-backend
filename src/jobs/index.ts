import { startSyncProtocol } from "./syncProtocol.js";
import { startSyncLeaderboard } from "./syncLeaderboard.js";
import { startSyncActiveTournaments } from "./syncActiveTournaments.js";
import { startSyncPuzzleStats } from "./syncPuzzleStats.js";
import { startCloseTournaments } from "./closeTournaments.js";
import { transactionIndexer } from "../indexer/transactionIndexer.js";
import { eventIndexer } from "../indexer/Eventindexer.js";
import { processMissingExpectedPrizes } from "./syncMissingPrizes.js";

export function startAllJobs(): void {
  console.log("\n🕐 Starting cron jobs...");

  // Layer 3: Server Startup auto-healing check for missing expected prizes
  processMissingExpectedPrizes().catch(e => console.error(e));

  startSyncProtocol();
  startSyncLeaderboard();
  startSyncActiveTournaments();
  startSyncPuzzleStats();
  startCloseTournaments();
  
  eventIndexer.start()
  transactionIndexer.start();
  
  console.log("✅ All cron jobs registered.\n");
}

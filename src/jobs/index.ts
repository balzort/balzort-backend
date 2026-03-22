import { startSyncProtocol } from "./syncProtocol.js";
import { startSyncLeaderboard } from "./syncLeaderboard.js";
import { startSyncActiveTournaments } from "./syncActiveTournaments.js";
import { startSyncPuzzleStats } from "./syncPuzzleStats.js";
import { transactionIndexer } from "../indexer/transactionIndexer.js";
import { eventIndexer } from "../indexer/Eventindexer.js";

export function startAllJobs(): void {
  console.log("\n🕐 Starting cron jobs...");
  startSyncProtocol();
  startSyncLeaderboard();
  startSyncActiveTournaments();
  startSyncPuzzleStats();
  
  eventIndexer.start()
  transactionIndexer.start();
  
  console.log("✅ All cron jobs registered.\n");
}

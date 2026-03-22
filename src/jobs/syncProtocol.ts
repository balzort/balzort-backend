import cron from "node-cron";
import { fetchGame } from "../solana/accounts/fetchGame.js";
import { ProtocolModel } from "../models/Protocol.js";
import { CRON } from "../utils/constants.js";

/**
 * Every 5 minutes: fetch the Game PDA from chain and sync to the protocol table.
 * This keeps treasury, fee bps, and pause state up to date without relying on events.
 */
export function startSyncProtocol(): void {
  cron.schedule(CRON.SYNC_PROTOCOL, async () => {
    try {
      const config = await fetchGame();

      if (!config) {
        console.warn("[syncProtocol] Game account not found on chain.");
        return;
      }

      await ProtocolModel.upsert({
        pda_address: config.address,
        authority: config.authority,
        treasury: config.treasury,
        treasury_fee_bps: config.treasuryFeeBps,
        is_paused: config.isPaused,
        tournament_count: config.tournamentCount.toString(),
      });

      console.log(
        `[syncProtocol] Synced. tournaments=${config.tournamentCount} paused=${config.isPaused} fee=${config.treasuryFeeBps}bps`
      );
    } catch (err: any) {
      console.error("[syncProtocol] Error:", err.message);
    }
  });

  console.log("✅ Cron: syncProtocol registered (every 5 min)");
}

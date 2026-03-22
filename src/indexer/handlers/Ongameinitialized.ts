import { ActivityModel } from "../../models/Activity.js";

/**
 * onGameInitialized
 * Event fields (events.rs): authority, treasury
 */
export async function onGameInitialized(
  event: any,
  sig: string,
  timestamp: number
): Promise<void> {
  const data = event.data;

  const authority = data.authority?.toString();
  const treasury  = data.treasury?.toString();

  const alreadyProcessed = await ActivityModel.alreadyProcessed(sig, "game_initialized");
  if (alreadyProcessed) return;

  await ActivityModel.log({
    event_type: "game_initialized",
    tx_signature: sig,
    block_time: timestamp,
    raw_data: { authority, treasury },
  });

  console.log(`[onGameInitialized] authority=${authority?.slice(0, 8)}...`);
}
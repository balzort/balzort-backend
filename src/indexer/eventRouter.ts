import { onGameInitialized } from "./handlers/Ongameinitialized.js";
import { onPuzzleInitialized } from "./handlers/Onpuzzleinitialized.js";
import { onPuzzleStarted } from "./handlers/Onpuzzlestarted.js";
import { onPuzzleFinalized } from "./handlers/onPuzzleFinalized.js";
import { onPuzzleAbandoned } from "./handlers/onPuzzleAbandoned.js";
import { onTournamentCreated } from "./handlers/onTournamentCreated.js";
import { onTournamentJoined } from "./handlers/onTournamentJoined.js";
import { onTournamentClosed } from "./handlers/onTournamentClosed.js";
import { onPrizeClaimed } from "./handlers/onPrizeClaimed.js";
import { onTournamentResultRecorded } from "./handlers/onTournamentResultRecorded.js";

/**
 * Routes a single decoded Anchor event to the correct handler.
 * Every event type defined in events.rs is handled here.
 */
export async function routeEvent(
  event: any,
  sig: string,
  timestamp: number
): Promise<void> {
  const eventName = event.name as string;

  console.log(`[EventRouter] Routing event: ${eventName} | sig: ${sig?.slice(0, 8)}...`);

  try {
    switch (eventName) {
      // ── Game ──────────────────────────────────────────────
      case "GameInitialized":
        await onGameInitialized(event, sig, timestamp);
        break;

      // GameUpdated: authority + field string — low-value, just log it
      case "GameUpdated":
        // No dedicated handler needed — just acknowledge
        console.log(`[EventRouter] GameUpdated acknowledged (no handler needed)`);
        break;

      // ── Puzzle ────────────────────────────────────────────
      case "PuzzleInitialized":
        await onPuzzleInitialized(event, sig, timestamp);
        break;
      case "PuzzleStarted":
        await onPuzzleStarted(event, sig, timestamp);
        break;
      case "PuzzleFinalized":
        await onPuzzleFinalized(event, sig, timestamp);
        break;
      case "PuzzleAbandoned":
        await onPuzzleAbandoned(event, sig, timestamp);
        break;

      // PuzzleDelegated: emitted when a puzzle is delegated to a validator
      // Low-value for analytics — acknowledged but not stored
      case "PuzzleDelegated":
        console.log(`[EventRouter] PuzzleDelegated acknowledged (no handler needed)`);
        break;

      // ── Tournament ────────────────────────────────────────
      case "TournamentCreated":
        await onTournamentCreated(event, sig, timestamp);
        break;
      case "TournamentJoined":
        await onTournamentJoined(event, sig, timestamp);
        break;
      case "TournamentClosed":
        await onTournamentClosed(event, sig, timestamp);
        break;
      case "TournamentResultRecorded":
        await onTournamentResultRecorded(event, sig, timestamp);
        break;
      case "PrizeClaimed":
        await onPrizeClaimed(event, sig, timestamp);
        break;

      default:
        // Truly unknown — new event added to the program without a handler
        console.warn(`[EventRouter] Unknown event type — update the router: ${eventName}`);
    }
  } catch (err: any) {
    console.error(`[EventRouter] Handler error for ${eventName} in ${sig.slice(0, 8)}...: ${err.message}`);
    throw err;
  }
}
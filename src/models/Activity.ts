import { supabase } from "../config/supabase.js";

const LOG_MAX_RETRIES = 4;
const LOG_RETRY_BASE_MS = 500;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export type ActivityEventType =
  | "puzzle_initialized"
  | "puzzle_started"
  | "puzzle_finalized"
  | "puzzle_abandoned"
  | "tournament_created"
  | "tournament_joined"
  | "tournament_closed"
  | "tournament_result_recorded"
  | "prize_claimed"
  | "game_initialized"
  | "game_updated"
  | "permission_created";

export interface ActivityRow {
  id: string;
  event_type: ActivityEventType;
  player_wallet: string | null;
  tournament_address: string | null;
  puzzle_board_pubkey: string | null;
  puzzle_stats_pubkey: string | null;
  tx_signature: string | null;
  slot: number | null;
  block_time: string | null;
  raw_data: Record<string, unknown>;
  created_at: string;
}

export interface LogActivityPayload {
  event_type: ActivityEventType;
  player_wallet?: string;
  tournament_address?: string;
  puzzle_board_pubkey?: string;
  puzzle_stats_pubkey?: string;
  tx_signature?: string;
  slot?: number;
  block_time?: number; // unix seconds
  raw_data: Record<string, unknown>;
}

export class ActivityModel {
  /**
   * Insert an activity row. Retries up to LOG_MAX_RETRIES times with
   * exponential backoff to handle transient Supabase connection failures
   * (e.g. "fetch failed" during server startup warm-up).
   */
  static async log(payload: LogActivityPayload): Promise<ActivityRow> {
    for (let attempt = 1; attempt <= LOG_MAX_RETRIES; attempt++) {
      try {
        const { data, error } = await supabase
          .from("activity")
          .insert({
            event_type: payload.event_type,
            player_wallet: payload.player_wallet ?? null,
            tournament_address: payload.tournament_address ?? null,
            puzzle_board_pubkey: payload.puzzle_board_pubkey ?? null,
            puzzle_stats_pubkey: payload.puzzle_stats_pubkey ?? null,
            tx_signature: payload.tx_signature ?? null,
            slot: payload.slot ?? null,
            block_time: payload.block_time
              ? new Date(payload.block_time * 1000).toISOString()
              : null,
            raw_data: payload.raw_data,
          })
          .select()
          .single();

        if (error) throw error;
        return data as ActivityRow;
      } catch (err: any) {
        // Unique constraint violation = already inserted, not a real error
        if (err?.code === "23505") throw err;

        if (attempt < LOG_MAX_RETRIES) {
          const delay = LOG_RETRY_BASE_MS * Math.pow(2, attempt - 1);
          console.warn(
            `⚠️  [ActivityModel.log] ${payload.event_type} failed (attempt ${attempt}/${LOG_MAX_RETRIES}): ${err.message} — retrying in ${delay}ms`,
          );
          await sleep(delay);
        } else {
          throw err;
        }
      }
    }
    // Unreachable but satisfies TypeScript
    throw new Error("[ActivityModel.log] Exhausted retries");
  }

  /**
   * Idempotency check: returns true if we already saved an activity row
   * for this exact (tx_signature, event_type) pair.
   *
   * The schema enforces unique (tx_signature, event_type) so a single
   * transaction that emits e.g. both PuzzleFinalized AND TournamentResultRecorded
   * will correctly produce two separate activity rows.
   *
   * IMPORTANT: always pass the event_type — never check by signature alone.
   */
  static async alreadyProcessed(
    txSignature: string,
    eventType: ActivityEventType,
  ): Promise<boolean> {
    const { data } = await supabase
      .from("activity")
      .select("id")
      .eq("tx_signature", txSignature)
      .eq("event_type", eventType)
      .limit(1)
      .maybeSingle(); // returns null (not an error) when row not found

    return !!data;
  }

  static async findByPlayer(
    playerWallet: string,
    limit = 50,
  ): Promise<ActivityRow[]> {
    const { data, error } = await supabase
      .from("activity")
      .select("*")
      .eq("player_wallet", playerWallet)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []) as ActivityRow[];
  }

  static async findByTournament(
    tournamentAddress: string,
    limit = 100,
  ): Promise<ActivityRow[]> {
    const { data, error } = await supabase
      .from("activity")
      .select("*")
      .eq("tournament_address", tournamentAddress)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []) as ActivityRow[];
  }

  static async findRecent(limit = 100): Promise<ActivityRow[]> {
    const { data, error } = await supabase
      .from("activity")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []) as ActivityRow[];
  }

  /**
   * Returns the tx_signature of the most recently saved activity row,
   * ordered by block_time. Used by EventIndexer as its resume cursor —
   * the same way TransactionIndexer reads from the transactions table.
   */
  static async getLatestSignature(): Promise<string | null> {
    const { data, error } = await supabase
      .from("activity")
      .select("tx_signature, block_time")
      .not("tx_signature", "is", null)
      .order("block_time", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data?.tx_signature ?? null;
  }
}

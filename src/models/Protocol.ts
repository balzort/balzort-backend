import { supabase } from "../config/supabase.js";

export interface ProtocolRow {
  id: string;
  pda_address: string;             // Game PDA pubkey
  authority: string;
  treasury: string;
  treasury_fee_bps: number;
  is_paused: boolean;
  tournament_count: string;        // u64 as string
  last_synced_at: string;
  created_at: string;
}

export interface UpsertProtocolPayload {
  pda_address: string;
  authority: string;
  treasury: string;
  treasury_fee_bps: number;
  is_paused: boolean;
  tournament_count: string;
}

export class ProtocolModel {
  /**
   * Upsert the protocol config row. There should only ever be one row.
   * Keyed on pda_address.
   */
  static async upsert(payload: UpsertProtocolPayload): Promise<ProtocolRow> {
    const { data, error } = await supabase
      .from("protocol")
      .upsert(
        {
          ...payload,
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: "pda_address" }
      )
      .select()
      .single();

    if (error) throw error;
    return data as ProtocolRow;
  }

  static async get(): Promise<ProtocolRow | null> {
    const { data, error } = await supabase
      .from("protocol")
      .select("*")
      .limit(1)
      .single();

    if (error?.code === "PGRST116") return null;
    if (error) throw error;
    return data as ProtocolRow;
  }
}

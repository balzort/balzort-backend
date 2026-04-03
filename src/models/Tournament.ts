import { supabase } from "../config/supabase.js";

export interface TournamentRow {
  id: string;
  on_chain_address: string;        // tournament PDA pubkey
  on_chain_id: string;             // tournament_id (u64 as string)
  authority: string;
  token_mint?: string | null;
  entry_fee: string;               // lamports as string (bigint safe)
  prize_pool: string;
  net_prize_pool: string;
  treasury_fee_bps: number;
  difficulty: number;
  num_tubes: number;
  balls_per_tube: number;
  start_time: string;              // ISO timestamp
  end_time: string;
  total_entries: number;
  total_completers: number;
  cumulative_weight: string;
  is_closed: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpsertTournamentPayload {
  on_chain_address: string;
  on_chain_id: string;
  authority: string;
  token_mint?: string;
  entry_fee: string;
  prize_pool: string;
  net_prize_pool: string;
  treasury_fee_bps: number;
  difficulty: number;
  num_tubes: number;
  balls_per_tube: number;
  start_time: number;   // unix seconds
  end_time: number;
  total_entries: number;
  total_completers: number;
  cumulative_weight: string;
  is_closed: boolean;
}

export class TournamentModel {
  static async upsert(payload: UpsertTournamentPayload): Promise<TournamentRow> {
    const { data, error } = await supabase
      .from("tournaments")
      .upsert(
        {
          on_chain_address: payload.on_chain_address,
          on_chain_id: payload.on_chain_id,
          authority: payload.authority,
          token_mint: payload.token_mint,
          entry_fee: payload.entry_fee,
          prize_pool: payload.prize_pool,
          net_prize_pool: payload.net_prize_pool,
          treasury_fee_bps: payload.treasury_fee_bps,
          difficulty: payload.difficulty,
          num_tubes: payload.num_tubes,
          balls_per_tube: payload.balls_per_tube,
          start_time: new Date(payload.start_time * 1000).toISOString(),
          end_time: new Date(payload.end_time * 1000).toISOString(),
          total_entries: payload.total_entries,
          total_completers: payload.total_completers,
          cumulative_weight: payload.cumulative_weight,
          is_closed: payload.is_closed,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "on_chain_address" }
      )
      .select()
      .single();

    if (error) throw error;
    return data as TournamentRow;
  }

  static async findById(id: string): Promise<TournamentRow | null> {
    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", id)
      .single();

    if (error?.code === "PGRST116") return null;
    if (error) throw error;
    return data as TournamentRow;
  }

  static async findByOnChainAddress(address: string): Promise<TournamentRow | null> {
    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .eq("on_chain_address", address)
      .single();

    if (error?.code === "PGRST116") return null;
    if (error) throw error;
    return data as TournamentRow;
  }

  static async findAll(
    page = 1,
    limit = 20,
    difficulty?: number,
    activeOnly = false
  ): Promise<{ data: TournamentRow[]; total: number }> {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const now = new Date().toISOString();

    let query = supabase
      .from("tournaments")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (difficulty !== undefined) {
      query = query.eq("difficulty", difficulty);
    }
    if (activeOnly) {
      query = query.eq("is_closed", false).gt("end_time", now);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: (data ?? []) as TournamentRow[], total: count ?? 0 };
  }

  static async findUnclosedTournaments(): Promise<TournamentRow[]> {
    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .eq("is_closed", false)
      .order("end_time", { ascending: true });

    if (error) throw error;
    return (data ?? []) as TournamentRow[];
  }

  static async markClosed(
    onChainAddress: string,
    totalEntries: number,
    totalCompleters: number,
    prizePool: string
  ): Promise<void> {
    const { error } = await supabase
      .from("tournaments")
      .update({
        is_closed: true,
        total_entries: totalEntries,
        total_completers: totalCompleters,
        prize_pool: prizePool,
        updated_at: new Date().toISOString(),
      })
      .eq("on_chain_address", onChainAddress);

    if (error) throw error;
  }

  static async findClosedTournaments(): Promise<TournamentRow[]> {
    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .eq("is_closed", true);

    if (error) throw error;
    return (data ?? []) as TournamentRow[];
  }
}

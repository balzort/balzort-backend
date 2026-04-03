import { supabase } from "../config/supabase.js";

export interface TournamentEntryRow {
  id: string;
  tournament_id: string;              // FK → tournaments.id
  on_chain_tournament_id: string;
  on_chain_entry_address: string;     // TournamentEntry PDA pubkey
  tournament_address: string;         // Tournament PDA pubkey
  player_account: string;           // Actually stores the Player PDA
  entry_deposit: string;              // lamports as string
  parimutuel_weight: string;          // u128 as string
  completed: boolean;
  has_claimed: boolean;
  elapsed_secs: number | null;
  move_count: number | null;
  expected_prize: string | null;      // lamports mapped from exact prize math
  prize_claimed: string | null;       // lamports actually claimed as verified by event
  created_at: string;
  updated_at: string;
}

export class TournamentEntryModel {
  static async upsert(payload: {
    tournament_id: string;
    on_chain_tournament_id: string;
    on_chain_entry_address: string;
    tournament_address: string;
    player_account: string;
    entry_deposit: string;
    parimutuel_weight: string;
    completed: boolean;
    has_claimed: boolean;
    elapsed_secs?: number;
    move_count?: number;
    expected_prize?: string;
    prize_claimed?: string;
  }): Promise<TournamentEntryRow> {
    const now = new Date().toISOString();
    
    // Check if it exists to avoid missing unique constraint errors on onConflict
    const { data: existing } = await supabase
      .from("tournament_entries")
      .select("id")
      .eq("tournament_address", payload.tournament_address)
      .eq("player_account", payload.player_account)
      .maybeSingle();

    if (existing) {
      // Strip undefined values so we don't overwrite existing data
      // (e.g. the sync job doesn't provide elapsed_secs/move_count,
      // and we don't want to null out values the indexer already set)
      const updateData: Record<string, unknown> = { updated_at: now };
      for (const [key, value] of Object.entries(payload)) {
        if (value !== undefined) updateData[key] = value;
      }
      const { data, error } = await supabase
        .from("tournament_entries")
        .update(updateData)
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      return data as TournamentEntryRow;
    } else {
      const { data, error } = await supabase
        .from("tournament_entries")
        .insert({
          ...payload,
          updated_at: now,
        })
        .select()
        .single();
      if (error) throw error;
      return data as TournamentEntryRow;
    }
  }

  static async findByTournamentAndPlayer(
    tournamentAddress: string,
    playerAccount: string
  ): Promise<TournamentEntryRow | null> {
    const { data, error } = await supabase
      .from("tournament_entries")
      .select("*")
      .eq("tournament_address", tournamentAddress)
      .eq("player_account", playerAccount)
      .single();

    if (error?.code === "PGRST116") return null;
    if (error) throw error;
    return data as TournamentEntryRow;
  }

  static async findByTournament(
    tournamentAddress: string
  ): Promise<TournamentEntryRow[]> {
    const { data, error } = await supabase
      .from("tournament_entries")
      .select("*")
      .eq("tournament_address", tournamentAddress)
      .order("parimutuel_weight", { ascending: false });

    if (error) throw error;
    return (data ?? []) as TournamentEntryRow[];
  }

  static async findByPlayer(playerAccount: string): Promise<TournamentEntryRow[]> {
    const { data, error } = await supabase
      .from("tournament_entries")
      .select("*, tournaments(*)")
      .eq("player_account", playerAccount)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as TournamentEntryRow[];
  }

  static async markCompleted(
    tournamentAddress: string,
    playerAccount: string,
    elapsedSecs: number,
    moveCount: number,
    parimutuelWeight: string
  ): Promise<void> {
    const { error } = await supabase
      .from("tournament_entries")
      .update({
        completed: true,
        elapsed_secs: elapsedSecs,
        move_count: moveCount,
        parimutuel_weight: parimutuelWeight,
        updated_at: new Date().toISOString(),
      })
      .eq("tournament_address", tournamentAddress)
      .eq("player_account", playerAccount);

    if (error) throw error;
  }

  static async updateExpectedPrize(
    id: string,
    expectedPrize: string
  ): Promise<void> {
    const { error } = await supabase
      .from("tournament_entries")
      .update({
        expected_prize: expectedPrize,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
      
    if (error) throw error;
  }

  static async markClaimed(
    tournamentAddress: string,
    playerAccount: string,
    prizeClaimed: string
  ): Promise<void> {
    const { error } = await supabase
      .from("tournament_entries")
      .update({
        has_claimed: true,
        prize_claimed: prizeClaimed,
        updated_at: new Date().toISOString(),
      })
      .eq("tournament_address", tournamentAddress)
      .eq("player_account", playerAccount);

    if (error) throw error;
  }
}

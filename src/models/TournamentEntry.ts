import { supabase } from "../config/supabase.js";

export interface TournamentEntryRow {
  id: string;
  tournament_id: string;              // FK → tournaments.id
  on_chain_entry_address: string;     // TournamentEntry PDA pubkey
  tournament_address: string;         // Tournament PDA pubkey
  player_wallet: string;
  entry_deposit: string;              // lamports as string
  parimutuel_weight: string;          // u128 as string
  completed: boolean;
  has_claimed: boolean;
  elapsed_secs: number | null;
  move_count: number | null;
  prize_claimed: string | null;       // lamports as string
  created_at: string;
  updated_at: string;
}

export class TournamentEntryModel {
  static async upsert(payload: {
    tournament_id: string;
    on_chain_entry_address: string;
    tournament_address: string;
    player_wallet: string;
    entry_deposit: string;
    parimutuel_weight: string;
    completed: boolean;
    has_claimed: boolean;
    elapsed_secs?: number;
    move_count?: number;
    prize_claimed?: string;
  }): Promise<TournamentEntryRow> {
    const { data, error } = await supabase
      .from("tournament_entries")
      .upsert(
        {
          ...payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "on_chain_entry_address" }
      )
      .select()
      .single();

    if (error) throw error;
    return data as TournamentEntryRow;
  }

  static async findByTournamentAndPlayer(
    tournamentAddress: string,
    playerWallet: string
  ): Promise<TournamentEntryRow | null> {
    const { data, error } = await supabase
      .from("tournament_entries")
      .select("*")
      .eq("tournament_address", tournamentAddress)
      .eq("player_wallet", playerWallet)
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

  static async findByPlayer(playerWallet: string): Promise<TournamentEntryRow[]> {
    const { data, error } = await supabase
      .from("tournament_entries")
      .select("*, tournaments(*)")
      .eq("player_wallet", playerWallet)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as TournamentEntryRow[];
  }

  static async markCompleted(
    tournamentAddress: string,
    playerWallet: string,
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
      .eq("player_wallet", playerWallet);

    if (error) throw error;
  }

  static async markClaimed(
    tournamentAddress: string,
    playerWallet: string,
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
      .eq("player_wallet", playerWallet);

    if (error) throw error;
  }
}

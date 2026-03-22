import { supabase } from "../config/supabase.js";

export interface PuzzleResultRow {
  id: string;
  player_wallet: string;
  puzzle_board_pubkey: string;
  puzzle_stats_pubkey: string;
  difficulty: number;
  num_tubes: number;
  balls_per_tube: number;
  move_count: number;
  undo_count: number;
  elapsed_secs: number;
  final_score: number;
  is_abandoned: boolean;
  is_solved: boolean;
  tx_signature: string | null;
  solved_at: string;
  created_at: string;
}

export interface CreatePuzzleResultPayload {
  player_wallet: string;
  puzzle_board_pubkey: string;
  puzzle_stats_pubkey: string;
  difficulty: number;
  num_tubes: number;
  balls_per_tube: number;
  move_count: number;
  undo_count: number;
  elapsed_secs: number;
  final_score: number;
  is_abandoned: boolean;
  is_solved: boolean;
  tx_signature?: string;
}

export class PuzzleResultModel {
  static async create(payload: CreatePuzzleResultPayload): Promise<PuzzleResultRow> {
    const { data, error } = await supabase
      .from("puzzle_results")
      .insert({
        ...payload,
        solved_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as PuzzleResultRow;
  }

  /**
   * Check if a result already exists for this puzzle_stats_pubkey to prevent duplicates.
   */
  static async existsByStatsAccount(puzzleStatsPubkey: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("puzzle_results")
      .select("id")
      .eq("puzzle_stats_pubkey", puzzleStatsPubkey)
      .single();

    if (error?.code === "PGRST116") return false;
    if (error) throw error;
    return !!data;
  }

  static async findByWallet(
    wallet: string,
    page = 1,
    limit = 20
  ): Promise<{ data: PuzzleResultRow[]; total: number }> {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from("puzzle_results")
      .select("*", { count: "exact" })
      .eq("player_wallet", wallet)
      .order("solved_at", { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { data: (data ?? []) as PuzzleResultRow[], total: count ?? 0 };
  }

  static async findByWalletAndDifficulty(
    wallet: string,
    difficulty: number,
    limit = 10
  ): Promise<PuzzleResultRow[]> {
    const { data, error } = await supabase
      .from("puzzle_results")
      .select("*")
      .eq("player_wallet", wallet)
      .eq("difficulty", difficulty)
      .eq("is_solved", true)
      .order("final_score", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []) as PuzzleResultRow[];
  }

  static async getBestScore(wallet: string, difficulty: number): Promise<number> {
    const { data, error } = await supabase
      .from("puzzle_results")
      .select("final_score")
      .eq("player_wallet", wallet)
      .eq("difficulty", difficulty)
      .eq("is_solved", true)
      .order("final_score", { ascending: false })
      .limit(1)
      .single();

    if (error?.code === "PGRST116") return 0;
    if (error) throw error;
    return data?.final_score ?? 0;
  }
}

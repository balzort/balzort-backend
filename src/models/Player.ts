import { supabase } from "../config/supabase.js";

export interface PlayerRow {
  id: string;
  privy_user_id: string;
  auth_method: "wallet" | "google" | "email";
  wallet_address: string | null;          // external wallet (wallet login only)
  embedded_wallet_address: string | null; // privy-managed embedded wallet
  email: string | null;
  is_email_verified: boolean;
  username: string | null;
  avatar_url: string | null;
  total_solved: number;
  best_score: number;
  current_streak: number;
  longest_streak: number;
  player_account_created: boolean;        // true once create_player tx confirmed
  player_account_pubkey: string | null;   // the on-chain PDA address
  last_active_at: string;
  created_at: string;
  updated_at: string;
}

export interface SmartSyncPayload {
  privy_user_id: string;
  auth_method: "wallet" | "google" | "email";
  wallet_address?: string | null;
  embedded_wallet_address?: string | null;
  email?: string | null;
  is_email_verified?: boolean;
  username?: string | undefined;
  avatar_url?: string | undefined;
}

export type SmartSyncStatus = "created" | "updated" | "no_change";

export class PlayerModel {
  /**
   * Upsert a player on login.
   *
   * Status semantics:
   *   "created"   — brand new player row inserted.
   *   "updated"   — existing player, at least one meaningful field was missing
   *                 and has now been filled in (embedded_wallet, email, username).
   *   "no_change" — existing player with all available fields already present;
   *                 only last_active_at was refreshed.
   *
   * This distinction lets the frontend skip redundant work and makes logs easier
   * to read — a flood of "updated" entries that are really just last_active_at
   * pings is misleading.
   */
  static async smartSync(
    payload: SmartSyncPayload
  ): Promise<{ user: PlayerRow; status: SmartSyncStatus }> {
    // ── Check for existing player ──────────────────────────────────────────
    const { data: existing } = await supabase
      .from("players")
      .select("*")
      .eq("privy_user_id", payload.privy_user_id)
      .single();

    // ── New player — INSERT ────────────────────────────────────────────────
    if (!existing) {
      const { data, error } = await supabase
        .from("players")
        .insert({
          privy_user_id:           payload.privy_user_id,
          auth_method:             payload.auth_method,
          wallet_address:          payload.wallet_address          ?? null,
          embedded_wallet_address: payload.embedded_wallet_address ?? null,
          email:                   payload.email                   ?? null,
          is_email_verified:       payload.is_email_verified       ?? false,
          username:                payload.username                ?? null,
          avatar_url:              payload.avatar_url              ?? null,
          last_active_at:          new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return { user: data as PlayerRow, status: "created" };
    }

    // ── Existing player — UPDATE only genuinely missing fields ────────────
    // We never overwrite a field the player has already set — only fill gaps.
    const meaningfulUpdates: Partial<PlayerRow> = {};

    if (payload.embedded_wallet_address && !existing.embedded_wallet_address) {
      meaningfulUpdates.embedded_wallet_address = payload.embedded_wallet_address;
    }
    if (payload.email && !existing.email) {
      meaningfulUpdates.email = payload.email;
    }
    if (payload.username && !existing.username) {
      meaningfulUpdates.username = payload.username;
    }

    // Always refresh last_active_at — but this alone is NOT a meaningful change.
    const updates: Partial<PlayerRow> = {
      ...meaningfulUpdates,
      last_active_at: new Date().toISOString(),
      updated_at:     new Date().toISOString(),
    };

    const status: SmartSyncStatus =
      Object.keys(meaningfulUpdates).length > 0 ? "updated" : "no_change";

    const { data, error } = await supabase
      .from("players")
      .update(updates)
      .eq("privy_user_id", payload.privy_user_id)
      .select()
      .single();

    if (error) throw error;
    return { user: data as PlayerRow, status };
  }

  static async findByPrivyId(privyUserId: string): Promise<PlayerRow | null> {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .eq("privy_user_id", privyUserId)
      .single();

    if (error?.code === "PGRST116") return null;
    if (error) throw error;
    return data as PlayerRow;
  }

  static async findByWallet(wallet: string): Promise<PlayerRow | null> {
    // Check embedded wallet first, then external wallet.
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .or(`embedded_wallet_address.eq.${wallet},wallet_address.eq.${wallet}`)
      .single();

    if (error?.code === "PGRST116") return null;
    if (error) throw error;
    return data as PlayerRow;
  }

  static async updateProfile(
    privyUserId: string,
    updates: { username?: string | undefined; avatar_url?: string | undefined }
  ): Promise<PlayerRow> {
    const { data, error } = await supabase
      .from("players")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("privy_user_id", privyUserId)
      .select()
      .single();

    if (error) throw error;
    return data as PlayerRow;
  }

  static async markPlayerAccountCreated(
    privyUserId: string,
    playerAccountPubkey: string
  ): Promise<void> {
    const { error } = await supabase
      .from("players")
      .update({
        player_account_created: true,
        player_account_pubkey:  playerAccountPubkey,
        updated_at:             new Date().toISOString(),
      })
      .eq("privy_user_id", privyUserId);

    if (error) throw error;
  }

  static async incrementSolved(wallet: string, score: number): Promise<void> {
    const { error } = await supabase.rpc("increment_player_solved", {
      p_wallet: wallet,
      p_score:  score,
    });

    if (error) throw error;
  }

  static async updateStreak(wallet: string, increment: boolean): Promise<void> {
    const { error } = await supabase.rpc(
      increment ? "increment_streak" : "reset_streak",
      { p_wallet: wallet }
    );

    if (error) throw error;
  }
}

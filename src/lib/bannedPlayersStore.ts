import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BannedPlayer {
  id: string;
  playerName: string;
  photoUrl: string | null;
  banReason: string;
  bannedBy: string;
  bannedAt: string;
  notes: string;
}

function rowToBannedPlayer(row: any): BannedPlayer {
  return {
    id: row.id,
    playerName: row.player_name,
    photoUrl: row.photo_url,
    banReason: row.ban_reason ?? "",
    bannedBy: row.banned_by,
    bannedAt: row.banned_at,
    notes: row.notes ?? "",
  };
}

// ─── API Functions ────────────────────────────────────────────────────────────

export async function getBannedPlayers(): Promise<BannedPlayer[]> {
  const { data, error } = await supabase
    .from("banned_players")
    .select("*")
    .order("banned_at", { ascending: false });
  if (error) throw new Error(error.message);

  return data.map(rowToBannedPlayer);
}

export async function addBannedPlayer(
  playerData: Omit<BannedPlayer, "id" | "bannedAt">
): Promise<BannedPlayer> {
  const id = `banned_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const { data, error } = await supabase
    .from("banned_players")
    .insert({
      id,
      player_name: playerData.playerName,
      photo_url: playerData.photoUrl,
      ban_reason: playerData.banReason,
      banned_by: playerData.bannedBy,
      notes: playerData.notes,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  return rowToBannedPlayer(data);
}

export async function updateBannedPlayer(
  id: string,
  updates: Partial<Omit<BannedPlayer, "id" | "bannedAt" | "bannedBy">>
): Promise<BannedPlayer> {
  const payload: any = {};
  if (updates.playerName !== undefined) payload.player_name = updates.playerName;
  if (updates.photoUrl !== undefined) payload.photo_url = updates.photoUrl;
  if (updates.banReason !== undefined) payload.ban_reason = updates.banReason;
  if (updates.notes !== undefined) payload.notes = updates.notes;

  const { data, error } = await supabase
    .from("banned_players")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);

  return rowToBannedPlayer(data);
}

export async function deleteBannedPlayer(id: string): Promise<void> {
  const { error } = await supabase.from("banned_players").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

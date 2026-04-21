import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BannedIndividual {
  id: string;
  individualName: string;
  photoUrl: string | null;
  banReason: string;
  bannedBy: string;
  bannedAt: string;
  notes: string;
}

function rowToBannedIndividual(row: any): BannedIndividual {
  return {
    id: row.id,
    individualName: row.individual_name,
    photoUrl: row.photo_url,
    banReason: row.ban_reason ?? "",
    bannedBy: row.banned_by,
    bannedAt: row.banned_at,
    notes: row.notes ?? "",
  };
}

// ─── API Functions ────────────────────────────────────────────────────────────

export async function getBannedIndividuals(): Promise<BannedIndividual[]> {
  const { data, error } = await supabase
    .from("banned_players")
    .select("*")
    .order("banned_at", { ascending: false });
  if (error) throw new Error(error.message);

  return data.map(rowToBannedIndividual);
}

export async function addBannedIndividual(
  individualData: Omit<BannedIndividual, "id" | "bannedAt">
): Promise<BannedIndividual> {
  const id = `banned_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const { data, error } = await supabase
    .from("banned_players")
    .insert({
      id,
      individual_name: individualData.individualName,
      photo_url: individualData.photoUrl,
      ban_reason: individualData.banReason,
      banned_by: individualData.bannedBy,
      notes: individualData.notes,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  return rowToBannedIndividual(data);
}

export async function updateBannedIndividual(
  id: string,
  updates: Partial<Omit<BannedIndividual, "id" | "bannedAt" | "bannedBy">>
): Promise<BannedIndividual> {
  const payload: any = {};
  if (updates.individualName !== undefined) payload.individual_name = updates.individualName;
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

  return rowToBannedIndividual(data);
}

export async function deleteBannedIndividual(id: string): Promise<void> {
  const { error } = await supabase.from("banned_players").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

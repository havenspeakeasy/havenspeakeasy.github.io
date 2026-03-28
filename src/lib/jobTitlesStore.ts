import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface JobTitle {
  id: string;
  name: string;
  isAdmin: boolean;
  createdAt: string;
}

// ─── Row mapper ───────────────────────────────────────────────────────────────

function mapRow(row: any): JobTitle {
  return {
    id: row.id,
    name: row.name,
    isAdmin: row.is_admin,
    createdAt: row.created_at,
  };
}

// ─── API Functions ────────────────────────────────────────────────────────────

export async function getJobTitles(): Promise<JobTitle[]> {
  const { data, error } = await supabase
    .from("job_titles")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  console.log("[JobTitlesStore] Fetched:", data);
  return (data ?? []).map(mapRow);
}

export async function addJobTitle(name: string, isAdmin: boolean): Promise<JobTitle> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Job title name cannot be empty.");

  const { data, error } = await supabase
    .from("job_titles")
    .insert({
      id: `jt-${Date.now()}`,
      name: trimmed,
      is_admin: isAdmin,
      created_at: new Date().toISOString().split("T")[0],
    })
    .select()
    .single();
  if (error) {
    if (error.code === "23505") throw new Error(`"${trimmed}" already exists.`);
    throw new Error(error.message);
  }
  console.log("[JobTitlesStore] Added:", data);
  return mapRow(data);
}

export async function deleteJobTitle(id: string): Promise<void> {
  const { error } = await supabase.from("job_titles").delete().eq("id", id);
  if (error) throw new Error(error.message);
  console.log("[JobTitlesStore] Deleted:", id);
}

export async function getJobTitleNames(): Promise<string[]> {
  const titles = await getJobTitles();
  return titles.map((jt) => jt.name);
}

// Sync in-memory cache for isAdminRole checks (refreshed on app load)
let _adminRoleNamesCache: string[] = ["Owner", "Line Manager"];

export async function refreshAdminRoleNamesCache(): Promise<void> {
  const titles = await getJobTitles();
  _adminRoleNamesCache = titles.filter((jt) => jt.isAdmin).map((jt) => jt.name);
  console.log("[JobTitlesStore] Admin cache refreshed:", _adminRoleNamesCache);
}

// Sync helper — used inside store.ts and AuthContext
export function getAdminRoleNames(): string[] {
  return _adminRoleNamesCache;
}

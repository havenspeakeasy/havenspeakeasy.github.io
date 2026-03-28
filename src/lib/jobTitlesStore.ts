import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface JobTitle {
  id: string;
  name: string;
  isAdmin: boolean;
  createdAt: string;
}

function rowToJobTitle(row: any): JobTitle {
  return {
    id: row.id,
    name: row.name,
    isAdmin: row.is_admin,
    createdAt: row.created_at,
  };
}

// ─── API Functions ────────────────────────────────────────────────────────────

export async function getJobTitles(): Promise<JobTitle[]> {
  const { data, error } = await supabase.from("job_titles").select("*").order("name");
  if (error) throw new Error(error.message);

  return data.map(rowToJobTitle);
}

export async function addJobTitle(name: string, isAdmin: boolean): Promise<JobTitle> {
  const id = `jt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const createdAt = new Date().toISOString();
  const { data, error } = await supabase.from("job_titles").insert({
    id,
    name,
    is_admin: isAdmin,
    created_at: createdAt,
  }).select().single();
  if (error) throw new Error(error.message);

  return rowToJobTitle(data);
}

export async function deleteJobTitle(id: string): Promise<void> {
  const { error } = await supabase.from("job_titles").delete().eq("id", id);
  if (error) throw new Error(error.message);

}

export async function getJobTitleNames(): Promise<string[]> {
  const titles = await getJobTitles();
  return titles.map((jt) => jt.name);
}

export function getAdminRoleNames(): string[] {
  // This is called synchronously from AuthContext — return from cache
  return _adminRoleNamesCache;
}

// In-memory cache, refreshed on login and after mutations
let _adminRoleNamesCache: string[] = ["Owner", "Line Manager"];

export async function refreshAdminRoleNamesCache(): Promise<void> {
  const { data, error } = await supabase.from("job_titles").select("name").eq("is_admin", true);
  if (error) {
    console.warn("[JobTitlesStore] Failed to refresh admin cache:", error.message);
    return;
  }
  _adminRoleNamesCache = data.map((r: any) => r.name);

}

// Bootstrap the cache immediately on module load
refreshAdminRoleNamesCache().catch(console.warn);

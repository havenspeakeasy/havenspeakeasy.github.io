import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export type NoticePriority = "normal" | "high" | "urgent";

export interface Notice {
  id: string;
  title: string;
  content: string;
  priority: NoticePriority;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

function rowToNotice(row: any): Notice {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    priority: row.priority as NoticePriority,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── API Functions ────────────────────────────────────────────────────────────

export async function getNotices(): Promise<Notice[]> {
  const { data, error } = await supabase
    .from("notices")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return data.map(rowToNotice);
}

export async function addNotice(
  noticeData: Omit<Notice, "id" | "createdAt" | "updatedAt">
): Promise<Notice> {
  const id = `notice_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const { data, error } = await supabase
    .from("notices")
    .insert({
      id,
      title: noticeData.title,
      content: noticeData.content,
      priority: noticeData.priority,
      created_by: noticeData.createdBy,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  return rowToNotice(data);
}

export async function updateNotice(
  id: string,
  updates: Partial<Omit<Notice, "id" | "createdAt" | "createdBy">>
): Promise<Notice> {
  const payload: any = {};
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.content !== undefined) payload.content = updates.content;
  if (updates.priority !== undefined) payload.priority = updates.priority;

  const { data, error } = await supabase
    .from("notices")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);

  return rowToNotice(data);
}

export async function deleteNotice(id: string): Promise<void> {
  const { error } = await supabase.from("notices").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

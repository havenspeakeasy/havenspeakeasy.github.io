import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Schedule {
  id: string;
  date: string;
  openingTime: string;
  closingTime: string;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

function rowToSchedule(row: any): Schedule {
  return {
    id: row.id,
    date: row.date,
    openingTime: row.opening_time,
    closingTime: row.closing_time,
    notes: row.notes ?? "",
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── API Functions ────────────────────────────────────────────────────────────

export async function getSchedules(): Promise<Schedule[]> {
  const { data, error } = await supabase
    .from("schedules")
    .select("*")
    .order("date", { ascending: true });
  if (error) throw new Error(error.message);

  return data.map(rowToSchedule);
}

export async function addSchedule(
  scheduleData: Omit<Schedule, "id" | "createdAt" | "updatedAt">
): Promise<Schedule> {
  const id = `schedule_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const { data, error } = await supabase
    .from("schedules")
    .insert({
      id,
      date: scheduleData.date,
      opening_time: scheduleData.openingTime,
      closing_time: scheduleData.closingTime,
      notes: scheduleData.notes,
      created_by: scheduleData.createdBy,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  return rowToSchedule(data);
}

export async function updateSchedule(
  id: string,
  updates: Partial<Omit<Schedule, "id" | "createdAt" | "createdBy">>
): Promise<Schedule> {
  const payload: any = {};
  if (updates.date !== undefined) payload.date = updates.date;
  if (updates.openingTime !== undefined) payload.opening_time = updates.openingTime;
  if (updates.closingTime !== undefined) payload.closing_time = updates.closingTime;
  if (updates.notes !== undefined) payload.notes = updates.notes;

  const { data, error } = await supabase
    .from("schedules")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);

  return rowToSchedule(data);
}

export async function deleteSchedule(id: string): Promise<void> {
  const { error } = await supabase.from("schedules").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

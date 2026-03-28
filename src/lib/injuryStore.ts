import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export type InjuryStatus = "pending" | "approved" | "declined";
export type MedicalStatus = "received" | "pending_care";

export interface InjuryReport {
  id: string;
  employeeId: string;
  incidentDate: string;
  submittedAt: string;
  location: string;
  description: string;
  injuryType: string;
  medicalStatus: MedicalStatus;
  medicalCost: number | null;
  medicalNotes: string;
  status: InjuryStatus;
  managerNote: string;
}

// ─── Row mapper ───────────────────────────────────────────────────────────────

function mapRow(row: any): InjuryReport {
  return {
    id: row.id,
    employeeId: row.employee_id,
    incidentDate: row.incident_date,
    submittedAt: row.submitted_at,
    location: row.location,
    description: row.description,
    injuryType: row.injury_type,
    medicalStatus: row.medical_status as MedicalStatus,
    medicalCost: row.medical_cost !== null ? Number(row.medical_cost) : null,
    medicalNotes: row.medical_notes ?? "",
    status: row.status as InjuryStatus,
    managerNote: row.manager_note ?? "",
  };
}

// ─── API Functions ────────────────────────────────────────────────────────────

export async function getInjuryReports(): Promise<InjuryReport[]> {
  const { data, error } = await supabase
    .from("injury_reports")
    .select("*")
    .order("submitted_at", { ascending: false });
  if (error) throw new Error(error.message);
  console.log("[InjuryStore] Fetched all:", data?.length);
  return (data ?? []).map(mapRow);
}

export async function getMyInjuryReports(employeeId: string): Promise<InjuryReport[]> {
  const { data, error } = await supabase
    .from("injury_reports")
    .select("*")
    .eq("employee_id", employeeId)
    .order("submitted_at", { ascending: false });
  if (error) throw new Error(error.message);
  console.log("[InjuryStore] Fetched for", employeeId, ":", data?.length);
  return (data ?? []).map(mapRow);
}

export async function addInjuryReport(
  reportData: Omit<InjuryReport, "id" | "submittedAt" | "status" | "managerNote">
): Promise<InjuryReport> {
  const { data, error } = await supabase
    .from("injury_reports")
    .insert({
      id: `ir-${Date.now()}`,
      employee_id: reportData.employeeId,
      incident_date: reportData.incidentDate,
      location: reportData.location,
      description: reportData.description,
      injury_type: reportData.injuryType,
      medical_status: reportData.medicalStatus,
      medical_cost: reportData.medicalCost,
      medical_notes: reportData.medicalNotes,
      status: "pending",
      manager_note: "",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  console.log("[InjuryStore] Report added:", data);
  return mapRow(data);
}

export async function updateInjuryReportStatus(
  id: string,
  status: InjuryStatus,
  managerNote = ""
): Promise<InjuryReport> {
  const { data, error } = await supabase
    .from("injury_reports")
    .update({ status, manager_note: managerNote })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  console.log("[InjuryStore] Status updated:", data);
  return mapRow(data);
}

export async function deleteInjuryReport(id: string): Promise<void> {
  const { error } = await supabase.from("injury_reports").delete().eq("id", id);
  if (error) throw new Error(error.message);
  console.log("[InjuryStore] Report deleted:", id);
}

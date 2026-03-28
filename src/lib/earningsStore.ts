import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CashDenomination {
  label: string;
  value: number;
  count: number;
}

export interface EarningsLog {
  id: string;
  employeeId: string;
  shiftId: string;
  submittedAt: string;
  denominations: CashDenomination[];
  totalCash: number;
  note: string;
  safeConfirmed: boolean;
}

// ─── Seed Denominations Template ─────────────────────────────────────────────

export const DENOMINATION_TEMPLATE: Omit<CashDenomination, "count">[] = [
  { label: "$100", value: 100 },
  { label: "$50",  value: 50  },
  { label: "$20",  value: 20  },
  { label: "$10",  value: 10  },
  { label: "$5",   value: 5   },
  { label: "$1",   value: 1   },
  { label: "25¢",  value: 0.25 },
  { label: "10¢",  value: 0.10 },
  { label: "5¢",   value: 0.05 },
  { label: "1¢",   value: 0.01 },
];

export function freshDenominations(): CashDenomination[] {
  return DENOMINATION_TEMPLATE.map((d) => ({ ...d, count: 0 }));
}

function rowToLog(row: any): EarningsLog {
  return {
    id: row.id,
    employeeId: row.employee_id,
    shiftId: row.shift_id,
    submittedAt: row.submitted_at,
    denominations: Array.isArray(row.denominations) ? row.denominations : JSON.parse(row.denominations ?? "[]"),
    totalCash: parseFloat(row.total_cash),
    note: row.note ?? "",
    safeConfirmed: row.safe_confirmed ?? false,
  };
}

// ─── API Functions ────────────────────────────────────────────────────────────

export async function getEarningsLogs(): Promise<EarningsLog[]> {
  const { data, error } = await supabase.from("earnings_logs").select("*").order("submitted_at", { ascending: false });
  if (error) throw new Error(error.message);

  return data.map(rowToLog);
}

export async function getMyEarningsLogs(employeeId: string): Promise<EarningsLog[]> {
  const { data, error } = await supabase
    .from("earnings_logs")
    .select("*")
    .eq("employee_id", employeeId)
    .order("submitted_at", { ascending: false });
  if (error) throw new Error(error.message);

  return data.map(rowToLog);
}

export async function addEarningsLog(
  logData: Omit<EarningsLog, "id" | "submittedAt">
): Promise<EarningsLog> {
  const id = `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const { data, error } = await supabase.from("earnings_logs").insert({
    id,
    employee_id: logData.employeeId,
    shift_id: logData.shiftId,
    denominations: logData.denominations,
    total_cash: logData.totalCash,
    note: logData.note,
    safe_confirmed: logData.safeConfirmed,
  }).select().single();
  if (error) throw new Error(error.message);

  return rowToLog(data);
}

export async function deleteEarningsLog(id: string): Promise<void> {
  const { error } = await supabase.from("earnings_logs").delete().eq("id", id);
  if (error) throw new Error(error.message);

}

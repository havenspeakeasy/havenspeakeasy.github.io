import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export type DebtStatus = "open" | "claimed" | "paid" | "defaulted";

export interface DebtRecord {
  id: string;
  debtorName: string;
  initialAmount: number;
  interestRate: number;
  totalOwed: number;
  loanDate: string;
  dueDate: string;
  status: DebtStatus;
  claimedBy: string | null;
  claimedAt: string | null;
  collectionNote: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

function rowToDebtRecord(row: any): DebtRecord {
  return {
    id: row.id,
    debtorName: row.debtor_name,
    initialAmount: parseFloat(row.initial_amount),
    interestRate: parseFloat(row.interest_rate),
    totalOwed: parseFloat(row.total_owed),
    loanDate: row.loan_date,
    dueDate: row.due_date,
    status: row.status as DebtStatus,
    claimedBy: row.claimed_by,
    claimedAt: row.claimed_at,
    collectionNote: row.collection_note ?? "",
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── API Functions ────────────────────────────────────────────────────────────

export async function getDebtRecords(): Promise<DebtRecord[]> {
  const { data, error } = await supabase
    .from("debt_collection")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return data.map(rowToDebtRecord);
}

export async function addDebtRecord(
  recordData: Omit<DebtRecord, "id" | "createdAt" | "updatedAt" | "claimedBy" | "claimedAt">
): Promise<DebtRecord> {
  const id = `debt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const { data, error } = await supabase
    .from("debt_collection")
    .insert({
      id,
      debtor_name: recordData.debtorName,
      initial_amount: recordData.initialAmount,
      interest_rate: recordData.interestRate,
      total_owed: recordData.totalOwed,
      loan_date: recordData.loanDate,
      due_date: recordData.dueDate,
      status: recordData.status,
      collection_note: recordData.collectionNote,
      created_by: recordData.createdBy,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  return rowToDebtRecord(data);
}

export async function updateDebtRecord(
  id: string,
  updates: Partial<Omit<DebtRecord, "id" | "createdAt" | "createdBy">>
): Promise<DebtRecord> {
  const payload: any = {};
  if (updates.debtorName !== undefined) payload.debtor_name = updates.debtorName;
  if (updates.initialAmount !== undefined) payload.initial_amount = updates.initialAmount;
  if (updates.interestRate !== undefined) payload.interest_rate = updates.interestRate;
  if (updates.totalOwed !== undefined) payload.total_owed = updates.totalOwed;
  if (updates.loanDate !== undefined) payload.loan_date = updates.loanDate;
  if (updates.dueDate !== undefined) payload.due_date = updates.dueDate;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.claimedBy !== undefined) payload.claimed_by = updates.claimedBy;
  if (updates.claimedAt !== undefined) payload.claimed_at = updates.claimedAt;
  if (updates.collectionNote !== undefined) payload.collection_note = updates.collectionNote;

  const { data, error } = await supabase
    .from("debt_collection")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);

  return rowToDebtRecord(data);
}

export async function deleteDebtRecord(id: string): Promise<void> {
  const { error } = await supabase.from("debt_collection").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function claimDebt(id: string, employeeId: string): Promise<DebtRecord> {
  const { data, error } = await supabase
    .from("debt_collection")
    .update({
      status: "claimed",
      claimed_by: employeeId,
      claimed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);

  return rowToDebtRecord(data);
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CashDenomination {
  label: string;   // e.g. "$100"
  value: number;   // face value in USD
  count: number;
}

export interface EarningsLog {
  id: string;
  employeeId: string;
  shiftId: string;
  submittedAt: string;       // ISO string
  denominations: CashDenomination[];
  totalCash: number;         // Calculated total
  note: string;
  safeConfirmed: boolean;    // Employee confirmed cash placed in safe
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
  return DENOMINATION_TEMPLATE.map(d => ({ ...d, count: 0 }));
}

// ─── Seed Data ───────────────────────────────────────────────────────────────

let earningsLogs: EarningsLog[] = [
  {
    id: "el-001",
    employeeId: "emp-3",
    shiftId: "shift-seed-1",
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    denominations: [
      { label: "$100", value: 100, count: 2 },
      { label: "$50",  value: 50,  count: 1 },
      { label: "$20",  value: 20,  count: 3 },
      { label: "$10",  value: 10,  count: 2 },
      { label: "$5",   value: 5,   count: 4 },
      { label: "$1",   value: 1,   count: 6 },
      { label: "25¢",  value: 0.25, count: 8 },
      { label: "10¢",  value: 0.10, count: 5 },
      { label: "5¢",   value: 0.05, count: 3 },
      { label: "1¢",   value: 0.01, count: 12 },
    ],
    totalCash: 336.97,
    note: "Busy Friday night, tips included.",
    safeConfirmed: true,
  },
];

// ─── API Functions ────────────────────────────────────────────────────────────

export async function getEarningsLogs(): Promise<EarningsLog[]> {
  await delay(150);
  return [...earningsLogs];
}

export async function getMyEarningsLogs(employeeId: string): Promise<EarningsLog[]> {
  await delay(150);
  return earningsLogs.filter(l => l.employeeId === employeeId);
}

export async function addEarningsLog(
  data: Omit<EarningsLog, "id" | "submittedAt">
): Promise<EarningsLog> {
  await delay(200);
  const log: EarningsLog = {
    ...data,
    id: `el-${Date.now()}`,
    submittedAt: new Date().toISOString(),
  };
  earningsLogs = [log, ...earningsLogs];
  console.log("[EarningsStore] Log added:", log);
  return log;
}

export async function deleteEarningsLog(id: string): Promise<void> {
  await delay(150);
  earningsLogs = earningsLogs.filter(l => l.id !== id);
  console.log("[EarningsStore] Log deleted:", id);
}

function delay(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

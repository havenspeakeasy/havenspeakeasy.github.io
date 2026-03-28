export type InjuryStatus = "pending" | "approved" | "declined";

export type MedicalStatus = "received" | "pending_care";

export interface InjuryReport {
  id: string;
  employeeId: string;
  incidentDate: string;        // ISO string
  submittedAt: string;         // ISO string
  location: string;            // Where on premises it happened
  description: string;         // What happened
  injuryType: string;          // e.g. "Cut", "Bruise", "Burn", etc.
  medicalStatus: MedicalStatus; // received care or still needs to go
  medicalCost: number | null;  // USD — null if not yet received care
  medicalNotes: string;        // e.g. hospital name, treatment details
  status: InjuryStatus;
  managerNote: string;         // Optional note from manager on approval/decline
}

// ─── Seed Data ───────────────────────────────────────────────────────────────

let injuryReports: InjuryReport[] = [
  {
    id: "ir-001",
    employeeId: "emp-3",
    incidentDate: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    location: "Bar Counter",
    description: "Cut my hand on a broken glass while cleaning up after closing. The glass shattered and a shard lodged into my palm.",
    injuryType: "Laceration",
    medicalStatus: "received",
    medicalCost: 120.00,
    medicalNotes: "Visited Urgent Care on Pillbox Hill. Received stitches and a tetanus shot.",
    status: "pending",
    managerNote: "",
  },
  {
    id: "ir-002",
    employeeId: "emp-4",
    incidentDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    location: "Back Storage Room",
    description: "Slipped on a wet floor near the ice machine. Fell and hurt my lower back.",
    injuryType: "Slip & Fall",
    medicalStatus: "pending_care",
    medicalCost: null,
    medicalNotes: "Haven't seen a doctor yet but the pain is persistent.",
    status: "pending",
    managerNote: "",
  },
  {
    id: "ir-003",
    employeeId: "emp-2",
    incidentDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(),
    location: "Entrance / Door",
    description: "Got into an altercation while managing the door. Sustained bruising on my forearm.",
    injuryType: "Altercation Injury",
    medicalStatus: "received",
    medicalCost: 65.00,
    medicalNotes: "Visited a walk-in clinic. X-ray confirmed no fractures. Pain relief prescribed.",
    status: "approved",
    managerNote: "Reimbursement approved. Well handled.",
  },
];

// ─── API Functions ────────────────────────────────────────────────────────────

export async function getInjuryReports(): Promise<InjuryReport[]> {
  await delay(150);
  return [...injuryReports];
}

export async function getMyInjuryReports(employeeId: string): Promise<InjuryReport[]> {
  await delay(150);
  return injuryReports.filter(r => r.employeeId === employeeId);
}

export async function addInjuryReport(
  data: Omit<InjuryReport, "id" | "submittedAt" | "status" | "managerNote">
): Promise<InjuryReport> {
  await delay(200);
  const report: InjuryReport = {
    ...data,
    id: `ir-${Date.now()}`,
    submittedAt: new Date().toISOString(),
    status: "pending",
    managerNote: "",
  };
  injuryReports = [report, ...injuryReports];
  console.log("[InjuryStore] Report added:", report);
  return report;
}

export async function updateInjuryReportStatus(
  id: string,
  status: InjuryStatus,
  managerNote = ""
): Promise<InjuryReport> {
  await delay(150);
  injuryReports = injuryReports.map(r =>
    r.id === id ? { ...r, status, managerNote } : r
  );
  const updated = injuryReports.find(r => r.id === id)!;
  console.log("[InjuryStore] Status updated:", updated);
  return updated;
}

export async function deleteInjuryReport(id: string): Promise<void> {
  await delay(150);
  injuryReports = injuryReports.filter(r => r.id !== id);
  console.log("[InjuryStore] Report deleted:", id);
}

function delay(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

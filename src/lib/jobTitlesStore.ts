// ─── Types ───────────────────────────────────────────────────────────────────

export interface JobTitle {
  id: string;
  name: string;
  isAdmin: boolean;   // true = Owner/Manager tier, false = Regular staff
  createdAt: string;
}

// ─── Seed Data ───────────────────────────────────────────────────────────────

let jobTitles: JobTitle[] = [
  { id: "jt-1", name: "Owner",       isAdmin: true,  createdAt: "2024-01-01" },
  { id: "jt-2", name: "Line Manager", isAdmin: true,  createdAt: "2024-01-01" },
  { id: "jt-3", name: "Bartender",   isAdmin: false, createdAt: "2024-01-01" },
  { id: "jt-4", name: "Card Dealer", isAdmin: false, createdAt: "2024-01-01" },
  { id: "jt-5", name: "Security",    isAdmin: false, createdAt: "2024-01-01" },
];

// ─── API Functions ────────────────────────────────────────────────────────────

export async function getJobTitles(): Promise<JobTitle[]> {
  await delay(150);
  return [...jobTitles];
}

export async function addJobTitle(
  name: string,
  isAdmin: boolean
): Promise<JobTitle> {
  await delay(200);
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Job title name cannot be empty.");
  const duplicate = jobTitles.find(
    (jt) => jt.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) throw new Error(`"${trimmed}" already exists.`);
  const jt: JobTitle = {
    id: `jt-${Date.now()}`,
    name: trimmed,
    isAdmin,
    createdAt: new Date().toISOString().split("T")[0],
  };
  jobTitles = [...jobTitles, jt];
  console.log("[JobTitlesStore] Added:", jt);
  return jt;
}

export async function deleteJobTitle(id: string): Promise<void> {
  await delay(150);
  jobTitles = jobTitles.filter((jt) => jt.id !== id);
  console.log("[JobTitlesStore] Deleted:", id);
}

// Helper to get just the names (used in dropdowns elsewhere)
export async function getJobTitleNames(): Promise<string[]> {
  await delay(100);
  return jobTitles.map((jt) => jt.name);
}

// Sync helper — no delay, used inside store.ts logic
export function getAdminRoleNames(): string[] {
  return jobTitles.filter((jt) => jt.isAdmin).map((jt) => jt.name);
}

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

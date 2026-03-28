import { getAdminRoleNames } from "@/lib/jobTitlesStore";

export type Role = string; // Now dynamic — managed via jobTitlesStore

export type Employee = {
  id: string;
  name: string;
  username: string;
  password: string;
  role: Role;
  hourlyRate: number;
  avatarInitials: string;
  avatarUrl?: string;
  joinedAt: string;
  isActive: boolean;
};

export type ShiftStatus = "pending" | "approved" | "declined";

export type Shift = {
  id: string;
  employeeId: string;
  clockIn: string;
  clockOut: string | null;
  totalMinutes: number | null;
  status: ShiftStatus;
  note?: string;
  earnings: number | null;
};

// ---------- Seed Data ----------
const initialEmployees: Employee[] = [
  {
    id: "emp-1",
    name: "Vincent Moretti",
    username: "owner",
    password: "owner123",
    role: "Owner",
    hourlyRate: 0,
    avatarInitials: "VM",
    joinedAt: "2024-01-15",
    isActive: true,
  },
  {
    id: "emp-2",
    name: "Rosa Delgado",
    username: "rosa.d",
    password: "pass123",
    role: "Line Manager",
    hourlyRate: 120,
    avatarInitials: "RD",
    joinedAt: "2024-02-01",
    isActive: true,
  },
  {
    id: "emp-3",
    name: "Tommy Vega",
    username: "tommy.v",
    password: "pass123",
    role: "Bartender",
    hourlyRate: 85,
    avatarInitials: "TV",
    joinedAt: "2024-03-10",
    isActive: true,
  },
  {
    id: "emp-4",
    name: "Lily Chen",
    username: "lily.c",
    password: "pass123",
    role: "Card Dealer",
    hourlyRate: 75,
    avatarInitials: "LC",
    joinedAt: "2024-03-22",
    isActive: true,
  },
  {
    id: "emp-5",
    name: "Marcus Stone",
    username: "marcus.s",
    password: "pass123",
    role: "Security",
    hourlyRate: 90,
    avatarInitials: "MS",
    joinedAt: "2024-04-05",
    isActive: true,
  },
  {
    id: "emp-6",
    name: "Elena Park",
    username: "elena.p",
    password: "pass123",
    role: "Bartender",
    hourlyRate: 70,
    avatarInitials: "EP",
    joinedAt: "2024-05-18",
    isActive: false,
  },
];

const now = new Date();
const d = (daysAgo: number, hours: number, mins = 0) => {
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hours, mins, 0, 0);
  return d.toISOString();
};

const initialShifts: Shift[] = [
  {
    id: "shift-1", employeeId: "emp-2", clockIn: d(6, 18), clockOut: d(6, 23, 30),
    totalMinutes: 330, status: "approved", earnings: 660, note: "Busy Friday night shift",
  },
  {
    id: "shift-2", employeeId: "emp-3", clockIn: d(5, 20), clockOut: d(5, 2),
    totalMinutes: 360, status: "approved", earnings: 510, note: "",
  },
  {
    id: "shift-3", employeeId: "emp-4", clockIn: d(4, 19), clockOut: d(4, 23),
    totalMinutes: 240, status: "pending", earnings: 300, note: "",
  },
  {
    id: "shift-4", employeeId: "emp-5", clockIn: d(3, 21), clockOut: d(3, 3),
    totalMinutes: 360, status: "pending", earnings: 540, note: "Door was slammed",
  },
  {
    id: "shift-5", employeeId: "emp-3", clockIn: d(2, 19), clockOut: d(2, 23, 45),
    totalMinutes: 285, status: "declined", earnings: 403.75, note: "",
  },
  {
    id: "shift-6", employeeId: "emp-2", clockIn: d(1, 18, 30), clockOut: d(1, 0),
    totalMinutes: 330, status: "pending", earnings: 660, note: "",
  },
];

// ---------- In-Memory State ----------
let employees: Employee[] = [...initialEmployees];
let shifts: Shift[] = [...initialShifts];
let currentUser: Employee | null = null;
let activeClockIns: Record<string, string> = {}; // employeeId -> clockInISO

// ---------- Auth ----------
export async function login(username: string, password: string): Promise<Employee> {
  await delay(400);
  const emp = employees.find(e => e.username === username && e.password === password);
  if (!emp) throw new Error("Invalid username or password.");
  if (!emp.isActive) throw new Error("Your account has been deactivated. Please contact management.");
  currentUser = emp;
  return emp;
}

export async function logout(): Promise<void> {
  await delay(200);
  currentUser = null;
}

export function getCurrentUser(): Employee | null {
  return currentUser;
}

// ---------- Employees ----------
export async function getEmployees(): Promise<Employee[]> {
  await delay(300);
  return [...employees];
}

export async function addEmployee(data: Omit<Employee, "id" | "avatarInitials">): Promise<Employee> {
  await delay(400);
  const existing = employees.find(e => e.username === data.username);
  if (existing) throw new Error("Username already exists.");
  const emp: Employee = {
    ...data,
    id: `emp-${Date.now()}`,
    avatarInitials: data.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2),
  };
  employees = [...employees, emp];
  return emp;
}

export async function updateEmployee(id: string, data: Partial<Employee>): Promise<Employee> {
  await delay(400);
  employees = employees.map(e => e.id === id ? { ...e, ...data } : e);
  const updated = employees.find(e => e.id === id)!;
  if (currentUser?.id === id) currentUser = updated;
  return updated;
}

export async function deleteEmployee(id: string): Promise<void> {
  await delay(300);
  employees = employees.filter(e => e.id !== id);
}

// ---------- Shifts ----------
export async function getShifts(): Promise<Shift[]> {
  await delay(300);
  return [...shifts];
}

export async function getShiftsByEmployee(employeeId: string): Promise<Shift[]> {
  await delay(300);
  return shifts.filter(s => s.employeeId === employeeId);
}

export async function clockIn(employeeId: string): Promise<Shift> {
  await delay(400);
  if (activeClockIns[employeeId]) throw new Error("Already clocked in.");
  const clockInTime = new Date().toISOString();
  activeClockIns[employeeId] = clockInTime;
  const shift: Shift = {
    id: `shift-${Date.now()}`,
    employeeId,
    clockIn: clockInTime,
    clockOut: null,
    totalMinutes: null,
    status: "pending",
    earnings: null,
    note: "",
  };
  shifts = [...shifts, shift];
  return shift;
}

export async function clockOut(employeeId: string): Promise<Shift> {
  await delay(400);
  const clockInTime = activeClockIns[employeeId];
  if (!clockInTime) throw new Error("Not currently clocked in.");
  const clockOutTime = new Date().toISOString();
  const totalMinutes = Math.round((new Date(clockOutTime).getTime() - new Date(clockInTime).getTime()) / 60000);
  delete activeClockIns[employeeId];
  const emp = employees.find(e => e.id === employeeId);
  const earnings = emp ? parseFloat(((totalMinutes / 60) * emp.hourlyRate).toFixed(2)) : 0;
  shifts = shifts.map(s =>
    s.employeeId === employeeId && s.clockOut === null
      ? { ...s, clockOut: clockOutTime, totalMinutes, earnings }
      : s
  );
  return shifts.find(s => s.employeeId === employeeId && s.clockOut === clockOutTime)!;
}

export function isClocked(employeeId: string): boolean {
  return !!activeClockIns[employeeId];
}

export async function updateShiftStatus(shiftId: string, status: ShiftStatus): Promise<Shift> {
  await delay(300);
  shifts = shifts.map(s => s.id === shiftId ? { ...s, status } : s);
  return shifts.find(s => s.id === shiftId)!;
}

export async function addManualShift(data: Omit<Shift, "id">): Promise<Shift> {
  await delay(400);
  const shift: Shift = { ...data, id: `shift-${Date.now()}` };
  shifts = [...shifts, shift];
  return shift;
}

// ---------- Helpers ----------
function delay(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function formatMoney(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ADMIN_ROLES and REGULAR_ROLES are now driven by jobTitlesStore.
// Use getAdminRoleNames() from jobTitlesStore for live checks.
export function isAdminRole(role: string): boolean {
  return getAdminRoleNames().includes(role);
}

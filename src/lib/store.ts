import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export type Role = string;

export interface Employee {
  id: string;
  name: string;
  username: string;
  password: string;
  role: Role;
  hourlyRate: number;
  isActive: boolean;
  avatarInitials: string;
  avatarUrl?: string | null;
  joinedAt: string;
}

export interface Shift {
  id: string;
  employeeId: string;
  clockIn: string;
  clockOut: string | null;
  totalMinutes: number | null;
  earnings: number | null;
  status: "pending" | "approved" | "declined";
  notes: string;
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

function rowToEmployee(row: any): Employee {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    password: row.password,
    role: row.role,
    hourlyRate: parseFloat(row.hourly_rate),
    isActive: row.is_active,
    avatarInitials: row.avatar_initials,
    avatarUrl: row.avatar_url ?? null,
    joinedAt: row.created_at ?? new Date().toISOString(),
  };
}

function rowToShift(row: any): Shift {
  return {
    id: row.id,
    employeeId: row.employee_id,
    clockIn: row.clock_in,
    clockOut: row.clock_out ?? null,
    totalMinutes: row.total_minutes ?? null,
    earnings: row.earnings !== null && row.earnings !== undefined ? parseFloat(row.earnings) : null,
    status: row.status as "pending" | "approved" | "declined",
    notes: row.notes ?? "",
  };
}

// ─── Session (stored in memory + localStorage) ────────────────────────────────

const SESSION_KEY = "haven_session_employee_id";

export function getCurrentUser(): Employee | null {
  // Synchronous: return from in-memory cache populated on login
  const cached = sessionCache;
  return cached;
}

let sessionCache: Employee | null = null;

export async function login(username: string, password: string): Promise<Employee> {
  console.log("[Store] Login attempt:", username, "password length:", password.length);
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("username", username.trim())
    .eq("password", password.trim())
    .eq("is_active", true)
    .maybeSingle();

  console.log("[Store] Login query result — data:", data, "error:", error);

  if (error) throw new Error(error.message);
  if (!data) {
    // Try without is_active filter to give a better error message
    const { data: anyUser } = await supabase.from("employees").select("id,username,is_active").eq("username", username.trim()).maybeSingle();
    console.log("[Store] User lookup (no filter):", anyUser);
    if (!anyUser) throw new Error("No account found with that username.");
    if (!anyUser.is_active) throw new Error("This account is inactive. Contact management.");
    throw new Error("Incorrect password.");
  }

  const emp = rowToEmployee(data);
  sessionCache = emp;
  localStorage.setItem(SESSION_KEY, emp.id);
  console.log("[Store] Login success:", emp.name);
  return emp;
}

export async function logout(): Promise<void> {
  sessionCache = null;
  localStorage.removeItem(SESSION_KEY);
}

/** Restore session from localStorage on page load */
export async function restoreSession(): Promise<Employee | null> {
  const id = localStorage.getItem(SESSION_KEY);
  if (!id) return null;
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
  const emp = rowToEmployee(data);
  sessionCache = emp;
  return emp;
}

// ─── Employee Management ──────────────────────────────────────────────────────

export async function getEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase.from("employees").select("*").order("name");
  if (error) throw new Error(error.message);
  console.log("[Store] Fetched employees:", data.length);
  return data.map(rowToEmployee);
}

export async function addEmployee(
  emp: Omit<Employee, "id" | "avatarInitials">
): Promise<Employee> {
  const initials = emp.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const id = `emp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const { data, error } = await supabase.from("employees").insert({
    id,
    name: emp.name,
    username: emp.username,
    password: emp.password,
    role: emp.role,
    hourly_rate: emp.hourlyRate,
    is_active: emp.isActive,
    avatar_initials: initials,
    avatar_url: emp.avatarUrl ?? null,
  }).select().single();
  if (error) throw new Error(error.message);
  console.log("[Store] Employee added:", data);
  return rowToEmployee(data);
}

export async function updateEmployee(
  id: string,
  updates: Partial<Omit<Employee, "id" | "avatarInitials">>
): Promise<Employee> {
  const payload: any = {};
  if (updates.name !== undefined) {
    payload.name = updates.name;
    payload.avatar_initials = updates.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  }
  if (updates.username !== undefined) payload.username = updates.username;
  if (updates.password !== undefined) payload.password = updates.password;
  if (updates.role !== undefined) payload.role = updates.role;
  if (updates.hourlyRate !== undefined) payload.hourly_rate = updates.hourlyRate;
  if (updates.isActive !== undefined) payload.is_active = updates.isActive;
  if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl;

  const { data, error } = await supabase.from("employees").update(payload).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  const emp = rowToEmployee(data);
  // Refresh session if editing self
  if (sessionCache?.id === id) sessionCache = emp;
  console.log("[Store] Employee updated:", emp);
  return emp;
}

export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase.from("employees").delete().eq("id", id);
  if (error) throw new Error(error.message);
  console.log("[Store] Employee deleted:", id);
}

// ─── Shift & Clocking Logic ───────────────────────────────────────────────────

export async function getShifts(): Promise<Shift[]> {
  const { data, error } = await supabase.from("shifts").select("*").order("clock_in", { ascending: false });
  if (error) throw new Error(error.message);
  console.log("[Store] Fetched shifts:", data.length);
  return data.map(rowToShift);
}

export async function getActiveShift(employeeId: string): Promise<Shift | null> {
  const { data, error } = await supabase
    .from("shifts")
    .select("*")
    .eq("employee_id", employeeId)
    .is("clock_out", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToShift(data) : null;
}

export async function clockIn(employeeId: string): Promise<Shift> {
  // Check not already clocked in
  const active = await getActiveShift(employeeId);
  if (active) throw new Error("You are already clocked in.");

  const id = `shift_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const { data, error } = await supabase.from("shifts").insert({
    id,
    employee_id: employeeId,
    clock_in: new Date().toISOString(),
    status: "pending",
    notes: "",
  }).select().single();
  if (error) throw new Error(error.message);
  return rowToShift(data);
}

export async function clockOut(employeeId: string): Promise<Shift> {
  const active = await getActiveShift(employeeId);
  if (!active) throw new Error("No active shift found.");

  // Get employee for hourly rate
  const { data: empData } = await supabase.from("employees").select("hourly_rate").eq("id", employeeId).single();
  const hourlyRate = empData ? parseFloat(empData.hourly_rate) : 0;

  const clockOutTime = new Date();
  const clockInTime = new Date(active.clockIn);
  const totalMinutes = Math.floor((clockOutTime.getTime() - clockInTime.getTime()) / 60000);
  const earnings = parseFloat(((totalMinutes / 60) * hourlyRate).toFixed(2));

  const { data, error } = await supabase.from("shifts").update({
    clock_out: clockOutTime.toISOString(),
    total_minutes: totalMinutes,
    earnings,
    status: "pending",
  }).eq("id", active.id).select().single();
  if (error) throw new Error(error.message);
  return rowToShift(data);
}

export async function addManualShift(
  employeeId: string,
  clockIn: string,
  clockOut: string,
  notes: string,
  hourlyRate: number
): Promise<Shift> {
  const totalMinutes = Math.floor((new Date(clockOut).getTime() - new Date(clockIn).getTime()) / 60000);
  const earnings = parseFloat(((totalMinutes / 60) * hourlyRate).toFixed(2));
  const id = `shift_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const { data, error } = await supabase.from("shifts").insert({
    id,
    employee_id: employeeId,
    clock_in: clockIn,
    clock_out: clockOut,
    total_minutes: totalMinutes,
    earnings,
    status: "pending",
    notes: notes ?? "",
  }).select().single();
  if (error) throw new Error(error.message);
  return rowToShift(data);
}

export async function updateShiftStatus(
  id: string,
  status: "approved" | "declined"
): Promise<Shift> {
  const { data, error } = await supabase.from("shifts").update({ status }).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return rowToShift(data);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

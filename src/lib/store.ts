import { supabase } from "@/integrations/supabase/client";
import { getAdminRoleNames, refreshAdminRoleNamesCache } from "@/lib/jobTitlesStore";

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

function mapEmployee(row: any): Employee {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    password: row.password,
    role: row.role,
    hourlyRate: Number(row.hourly_rate),
    isActive: row.is_active,
    avatarInitials: row.avatar_initials,
    avatarUrl: row.avatar_url ?? null,
    joinedAt: row.created_at ?? new Date().toISOString(),
  };
}

function mapShift(row: any): Shift {
  return {
    id: row.id,
    employeeId: row.employee_id,
    clockIn: row.clock_in,
    clockOut: row.clock_out ?? null,
    totalMinutes: row.total_minutes ?? null,
    earnings: row.earnings !== null ? Number(row.earnings) : null,
    status: row.status,
    notes: row.notes ?? "",
  };
}

// ─── Session state ────────────────────────────────────────────────────────────

const SESSION_KEY = "haven_current_user";

let currentUser: Employee | null = (() => {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as Employee; } catch { return null; }
})();

export function getCurrentUser(): Employee | null {
  if (currentUser) return currentUser;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try { currentUser = JSON.parse(raw) as Employee; return currentUser; } catch { return null; }
}

// ─── Authentication ───────────────────────────────────────────────────────────

export async function login(username: string, password: string): Promise<Employee> {
  await refreshAdminRoleNamesCache();

  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("username", username)
    .single();

  if (error || !data) throw new Error("Invalid username or password.");
  if (data.password !== password) throw new Error("Invalid username or password.");
  if (!data.is_active) throw new Error("This account has been deactivated. Contact management.");

  currentUser = mapEmployee(data);
  localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
  console.log("[Store] Logged in:", currentUser);
  return currentUser;
}

export async function logout(): Promise<void> {
  currentUser = null;
  localStorage.removeItem(SESSION_KEY);
  console.log("[Store] Logged out.");
}

// ─── Employee Management ──────────────────────────────────────────────────────

export async function getEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  console.log("[Store] Fetched employees:", data?.length);
  return (data ?? []).map(mapEmployee);
}

export async function addEmployee(
  emp: Omit<Employee, "id" | "avatarInitials">
): Promise<Employee> {
  const initials = emp.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const { data, error } = await supabase
    .from("employees")
    .insert({
      id: `emp-${Date.now()}`,
      name: emp.name,
      username: emp.username,
      password: emp.password,
      role: emp.role,
      hourly_rate: emp.hourlyRate,
      is_active: emp.isActive,
      avatar_initials: initials,
      avatar_url: emp.avatarUrl ?? null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("Username already taken.");
    throw new Error(error.message);
  }
  console.log("[Store] Employee added:", data);
  return mapEmployee(data);
}

export async function updateEmployee(
  id: string,
  updates: Partial<Omit<Employee, "id" | "avatarInitials">>
): Promise<Employee> {
  const dbUpdates: Record<string, any> = {};
  if (updates.name !== undefined) {
    dbUpdates.name = updates.name;
    dbUpdates.avatar_initials = updates.name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (updates.username !== undefined) dbUpdates.username = updates.username;
  if (updates.password !== undefined) dbUpdates.password = updates.password;
  if (updates.role !== undefined) dbUpdates.role = updates.role;
  if (updates.hourlyRate !== undefined) dbUpdates.hourly_rate = updates.hourlyRate;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
  if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;

  const { data, error } = await supabase
    .from("employees")
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  const updated = mapEmployee(data);
  if (currentUser?.id === id) currentUser = updated;
  console.log("[Store] Employee updated:", updated);
  return updated;
}

export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase.from("employees").delete().eq("id", id);
  if (error) throw new Error(error.message);
  console.log("[Store] Employee deleted:", id);
}

// ─── Shift & Clocking Logic ───────────────────────────────────────────────────

export function isClocked(_employeeId: string): boolean {
  // This is checked synchronously; we rely on the shifts query to tell us
  // if there's an open shift. Returns false by default; ClockPage checks via query.
  return false;
}

export async function getActiveShift(employeeId: string): Promise<Shift | null> {
  const { data, error } = await supabase
    .from("shifts")
    .select("*")
    .eq("employee_id", employeeId)
    .is("clock_out", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapShift(data) : null;
}

export async function clockIn(employeeId: string): Promise<Shift> {
  const existing = await getActiveShift(employeeId);
  if (existing) throw new Error("You are already clocked in.");

  const { data, error } = await supabase
    .from("shifts")
    .insert({
      id: `shift-${Date.now()}`,
      employee_id: employeeId,
      clock_in: new Date().toISOString(),
      status: "pending",
      notes: "",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  console.log("[Store] Clocked in:", data);
  return mapShift(data);
}

export async function clockOut(employeeId: string): Promise<Shift> {
  const active = await getActiveShift(employeeId);
  if (!active) throw new Error("You are not currently clocked in.");

  const { data: empData } = await supabase
    .from("employees")
    .select("hourly_rate")
    .eq("id", employeeId)
    .single();

  const hourlyRate = empData ? Number(empData.hourly_rate) : 0;
  const clockOutTime = new Date();
  const clockInTime = new Date(active.clockIn);
  const totalMinutes = Math.round((clockOutTime.getTime() - clockInTime.getTime()) / 60000);
  const earnings = parseFloat(((totalMinutes / 60) * hourlyRate).toFixed(2));

  const { data, error } = await supabase
    .from("shifts")
    .update({
      clock_out: clockOutTime.toISOString(),
      total_minutes: totalMinutes,
      earnings,
    })
    .eq("id", active.id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  console.log("[Store] Clocked out:", data);
  return mapShift(data);
}

export async function getShifts(): Promise<Shift[]> {
  const { data, error } = await supabase
    .from("shifts")
    .select("*")
    .order("clock_in", { ascending: false });
  if (error) throw new Error(error.message);
  console.log("[Store] Fetched shifts:", data?.length);
  return (data ?? []).map(mapShift);
}

export async function updateShiftStatus(
  shiftId: string,
  status: "approved" | "declined"
): Promise<Shift> {
  const { data, error } = await supabase
    .from("shifts")
    .update({ status })
    .eq("id", shiftId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  console.log("[Store] Shift status updated:", data);
  return mapShift(data);
}

export async function addManualShift(
  employeeId: string,
  clockIn: string,
  clockOut: string,
  notes: string,
  hourlyRate: number
): Promise<Shift> {
  const totalMinutes = Math.round(
    (new Date(clockOut).getTime() - new Date(clockIn).getTime()) / 60000
  );
  const earnings = parseFloat(((totalMinutes / 60) * hourlyRate).toFixed(2));

  const { data, error } = await supabase
    .from("shifts")
    .insert({
      id: `shift-${Date.now()}`,
      employee_id: employeeId,
      clock_in: clockIn,
      clock_out: clockOut,
      total_minutes: totalMinutes,
      earnings,
      status: "pending",
      notes,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  console.log("[Store] Manual shift added:", data);
  return mapShift(data);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function isAdminRole(role: string): boolean {
  return getAdminRoleNames().includes(role);
}

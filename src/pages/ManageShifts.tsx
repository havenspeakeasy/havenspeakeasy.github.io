import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getShifts, getEmployees, updateShiftStatus, formatDuration, formatMoney, addManualShift } from "@/lib/store";
import AppShell from "@/components/AppShell";
import { StatusBadge, formatDateTime } from "./Dashboard";
import { toast } from "sonner";
import { Check, X, Filter, Plus, DollarSign, Clock, Users, TrendingUp } from "lucide-react";

type FilterType = "all" | "pending" | "approved" | "declined";

function getWeekStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export default function ManageShifts() {
  const qc = useQueryClient();
  const { data: shifts = [] } = useQuery({ queryKey: ["shifts"], queryFn: getShifts });
  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: getEmployees });
  const [filter, setFilter] = useState<FilterType>("pending");
  const [empFilter, setEmpFilter] = useState("all");
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ employeeId: "", clockIn: "", clockOut: "", note: "" });

  const handleStatus = async (shiftId: string, status: "approved" | "declined") => {
    await updateShiftStatus(shiftId, status);
    toast.success(`Shift ${status}.`);
    qc.invalidateQueries({ queryKey: ["shifts"] });
  };

  const completedShifts = shifts.filter(s => s.clockOut !== null);

  const filtered = completedShifts
    .filter(s => filter === "all" || s.status === filter)
    .filter(s => empFilter === "all" || s.employeeId === empFilter)
    .sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());

  const pending = completedShifts.filter(s => s.status === "pending");
  const totalApprovedPayroll = completedShifts.filter(s => s.status === "approved").reduce((sum, s) => sum + (s.earnings ?? 0), 0);
  const pendingPayroll = pending.reduce((sum, s) => sum + (s.earnings ?? 0), 0);

  const handleAddShift = async () => {
    if (!addForm.employeeId || !addForm.clockIn || !addForm.clockOut) {
      toast.error("Please fill all required fields.");
      return;
    }
    const emp = employees.find(e => e.id === addForm.employeeId);
    if (!emp) return;
    const clockInDate = new Date(addForm.clockIn);
    const clockOutDate = new Date(addForm.clockOut);
    if (clockOutDate.getTime() <= clockInDate.getTime()) { toast.error("Clock out must be after clock in."); return; }
    await addManualShift(addForm.employeeId, clockInDate.toISOString(), clockOutDate.toISOString(), addForm.note, emp.hourlyRate);
    toast.success("Shift added and pending approval.");
    qc.invalidateQueries({ queryKey: ["shifts"] });
    setAddModal(false);
    setAddForm({ employeeId: "", clockIn: "", clockOut: "", note: "" });
  };

  // Weekly payroll breakdown per employee (approved only)
  const weekStart = getWeekStart();
  const payrollByEmp = employees.map(emp => {
    const empShifts = completedShifts.filter(s => s.employeeId === emp.id && s.status === "approved" && new Date(s.clockOut!) >= weekStart);
    return { emp, total: empShifts.reduce((sum, s) => sum + (s.earnings ?? 0), 0), hours: empShifts.reduce((sum, s) => sum + (s.totalMinutes ?? 0), 0) };
  }).filter(e => e.total > 0).sort((a, b) => b.total - a.total);

  return (
    <AppShell>
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Manage Shifts</h1>
            <p className="page-subtitle">Review, approve, or decline employee shift logs</p>
          </div>
          <button className="haven-btn-primary" onClick={() => setAddModal(true)}><Plus size={16} /> Add Shift</button>
        </div>

        {/* Summary */}
        <div className="stats-grid mb-6">
          <div className="stat-card stat-card-amber">
            <div className="stat-icon"><Clock size={20} /></div>
            <div>
              <p className="stat-label">Pending Approval</p>
              <p className="stat-value">{pending.length}</p>
              <p className="stat-sub">{formatMoney(pendingPayroll)} at stake</p>
            </div>
          </div>
          <div className="stat-card stat-card-green">
            <div className="stat-icon"><DollarSign size={20} /></div>
            <div>
              <p className="stat-label">Approved Payroll</p>
              <p className="stat-value">{formatMoney(totalApprovedPayroll)}</p>
              <p className="stat-sub">Total owed to staff</p>
            </div>
          </div>
          <div className="stat-card stat-card-blue">
            <div className="stat-icon"><Users size={20} /></div>
            <div>
              <p className="stat-label">Staff on Payroll</p>
              <p className="stat-value">{payrollByEmp.length}</p>
              <p className="stat-sub">With approved hours</p>
            </div>
          </div>
          <div className="stat-card stat-card-purple">
            <div className="stat-icon"><TrendingUp size={20} /></div>
            <div>
              <p className="stat-label">Total Shifts Logged</p>
              <p className="stat-value">{completedShifts.length}</p>
              <p className="stat-sub">Across all staff</p>
            </div>
          </div>
        </div>

        {/* Payroll Breakdown */}
        {payrollByEmp.length > 0 && (
          <>
            <div className="section-title mb-1" style={{ fontSize: '0.7rem', color: 'var(--cream-muted)', fontWeight: 400, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Week of {getWeekStart().toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
            <div className="section-title mb-3">Weekly Salary Overview (Approved)</div>
            <div className="payroll-grid mb-8">
              {payrollByEmp.map(({ emp, total, hours }) => (
                <div key={emp.id} className="payroll-card">
                  <div className="avatar-sm">{emp.avatarInitials}</div>
                  <div className="payroll-info">
                    <p className="payroll-name">{emp.name}</p>
                    <p className="payroll-role">{emp.role} · {formatDuration(hours)}</p>
                  </div>
                  <div className="payroll-amount">{formatMoney(total)}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Filters */}
        <div className="filters-row">
          <div className="filter-tabs">
            {(["pending", "approved", "declined", "all"] as FilterType[]).map(f => (
              <button key={f} className={`filter-tab ${filter === f ? "filter-tab-active" : ""}`} onClick={() => setFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f === "pending" && pending.length > 0 && <span className="filter-badge">{pending.length}</span>}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Filter size={15} style={{ color: "var(--cream-muted)" }} />
            <select className="haven-select-sm" value={empFilter} onChange={e => setEmpFilter(e.target.value)}>
              <option value="all">All Employees</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
        </div>

        {/* Shifts Table */}
        <div className="haven-table-wrap">
          <table className="haven-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Duration</th>
                <th>Earnings</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(shift => {
                const emp = employees.find(e => e.id === shift.employeeId);
                return (
                  <tr key={shift.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="avatar-sm">{emp?.avatarInitials ?? "?"}</div>
                        <div>
                          <p style={{ fontWeight: 500 }}>{emp?.name ?? "Unknown"}</p>
                          <p style={{ fontSize: "0.75rem", color: "var(--cream-muted)" }}>{emp?.role}</p>
                        </div>
                      </div>
                    </td>
                    <td>{formatDateTime(shift.clockIn)}</td>
                    <td>{shift.clockOut ? formatDateTime(shift.clockOut) : "—"}</td>
                    <td>{shift.totalMinutes !== null ? formatDuration(shift.totalMinutes) : "—"}</td>
                    <td>{shift.earnings !== null ? formatMoney(shift.earnings) : "—"}</td>
                    <td><StatusBadge status={shift.status} /></td>
                    <td>
                      {shift.status === "pending" ? (
                        <div className="action-btns">
                          <button className="action-btn action-btn-approve" onClick={() => handleStatus(shift.id, "approved")} title="Approve"><Check size={14} /> Approve</button>
                          <button className="action-btn action-btn-decline" onClick={() => handleStatus(shift.id, "declined")} title="Decline"><X size={14} /> Decline</button>
                        </div>
                      ) : (
                        <span className="text-muted text-sm">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="empty-row">No shifts match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Manual Shift Modal */}
      {addModal && (
        <div className="modal-overlay" onClick={() => setAddModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Manual Shift</h2>
              <button className="icon-btn" onClick={() => setAddModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <label className="form-label">Employee *</label>
                <select className="haven-select" value={addForm.employeeId} onChange={e => setAddForm(f => ({ ...f, employeeId: e.target.value }))}>
                  <option value="">Select employee...</option>
                  {employees.filter(e => e.isActive).map(e => <option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}
                </select>
              </div>
              <div className="form-row-2col">
                <div className="form-row">
                  <label className="form-label">Clock In *</label>
                  <input className="haven-input-sm" type="datetime-local" value={addForm.clockIn} onChange={e => setAddForm(f => ({ ...f, clockIn: e.target.value }))} />
                </div>
                <div className="form-row">
                  <label className="form-label">Clock Out *</label>
                  <input className="haven-input-sm" type="datetime-local" value={addForm.clockOut} onChange={e => setAddForm(f => ({ ...f, clockOut: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <label className="form-label">Note (optional)</label>
                <input className="haven-input-sm" value={addForm.note} onChange={e => setAddForm(f => ({ ...f, note: e.target.value }))} placeholder="e.g. Holiday event" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="haven-btn-ghost" onClick={() => setAddModal(false)}>Cancel</button>
              <button className="haven-btn-primary" onClick={handleAddShift}>Add Shift</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

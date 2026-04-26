import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getShifts, getEmployees, formatDuration, formatMoney } from "@/lib/store";
import AppShell from "@/components/AppShell";
import { StatusBadge, formatDateTime } from "./Dashboard";
import { DollarSign, Clock, TrendingUp, Calendar, User, ChevronRight } from "lucide-react";

type Period = "week" | "month" | "all";

function getWeekStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  // Calculate days since Monday (0 = Monday, 6 = Sunday)
  const dayOfWeek = d.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  d.setDate(d.getDate() - daysSinceMonday);
  return d;
}

function getMonthStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d;
}

export default function EmployeeStats() {
  const { data: shifts = [] } = useQuery({ queryKey: ["shifts"], queryFn: getShifts });
  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: getEmployees });
  const [selectedEmp, setSelectedEmp] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("week");

  const weekStart = getWeekStart();
  const monthStart = getMonthStart();

  const periodStart = period === "week" ? weekStart : period === "month" ? monthStart : null;

  // Calculate stats for all employees
  const employeeStats = employees.map(emp => {
    const empShifts = shifts.filter(s => s.employeeId === emp.id && s.clockOut !== null);
    const periodShifts = empShifts.filter(s =>
      periodStart === null || new Date(s.clockOut!) >= periodStart
    );
    const approvedShifts = periodShifts.filter(s => s.status === "approved");
    const pendingShifts = periodShifts.filter(s => s.status === "pending");

    return {
      employee: emp,
      totalHours: approvedShifts.reduce((sum, s) => sum + (s.totalMinutes ?? 0), 0),
      totalEarnings: approvedShifts.reduce((sum, s) => sum + (s.earnings ?? 0), 0),
      pendingHours: pendingShifts.reduce((sum, s) => sum + (s.totalMinutes ?? 0), 0),
      pendingEarnings: pendingShifts.reduce((sum, s) => sum + (s.earnings ?? 0), 0),
      approvedCount: approvedShifts.length,
      pendingCount: pendingShifts.length,
      allTimeShifts: empShifts.filter(s => s.status === "approved").length,
    };
  }).filter(stat => stat.totalEarnings > 0 || stat.pendingEarnings > 0)
    .sort((a, b) => b.totalEarnings - a.totalEarnings);

  const PERIOD_LABELS: Record<Period, string> = {
    week: "This Week",
    month: "This Month",
    all: "All Time",
  };

  const selectedEmployee = employees.find(e => e.id === selectedEmp);
  const selectedShifts = selectedEmployee
    ? shifts.filter(s => s.employeeId === selectedEmp && s.clockOut !== null && (periodStart === null || new Date(s.clockOut!) >= periodStart))
      .sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime())
    : [];

  const selectedStats = employeeStats.find(s => s.employee.id === selectedEmp);

  return (
    <AppShell>
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Employee Payroll Stats</h1>
            <p className="page-subtitle">Detailed breakdown of approved earnings and hours per employee</p>
          </div>
          <div className="period-toggle-row" style={{ margin: 0 }}>
            {(["week", "month", "all"] as Period[]).map(p => (
              <button
                key={p}
                className={`period-toggle-btn ${period === p ? "period-toggle-active" : ""}`}
                onClick={() => setPeriod(p)}
              >
                {p === "week" ? "This Week" : p === "month" ? "This Month" : "All Time"}
              </button>
            ))}
          </div>
        </div>

        {!selectedEmp ? (
          <>
            {/* Summary Overview */}
            <div className="stats-grid mb-6">
              <div className="stat-card stat-card-green">
                <div className="stat-icon"><DollarSign size={20} /></div>
                <div>
                  <p className="stat-label">Total Payroll ({PERIOD_LABELS[period]})</p>
                  <p className="stat-value">{formatMoney(employeeStats.reduce((sum, s) => sum + s.totalEarnings, 0))}</p>
                  <p className="stat-sub">Approved earnings ready to pay</p>
                </div>
              </div>
              <div className="stat-card stat-card-amber">
                <div className="stat-icon"><Clock size={20} /></div>
                <div>
                  <p className="stat-label">Pending Payroll</p>
                  <p className="stat-value">{formatMoney(employeeStats.reduce((sum, s) => sum + s.pendingEarnings, 0))}</p>
                  <p className="stat-sub">Awaiting approval</p>
                </div>
              </div>
              <div className="stat-card stat-card-blue">
                <div className="stat-icon"><TrendingUp size={20} /></div>
                <div>
                  <p className="stat-label">Total Hours ({PERIOD_LABELS[period]})</p>
                  <p className="stat-value">{formatDuration(employeeStats.reduce((sum, s) => sum + s.totalHours, 0))}</p>
                  <p className="stat-sub">Across all staff</p>
                </div>
              </div>
              <div className="stat-card stat-card-purple">
                <div className="stat-icon"><User size={20} /></div>
                <div>
                  <p className="stat-label">Active Staff</p>
                  <p className="stat-value">{employeeStats.length}</p>
                  <p className="stat-sub">With approved shifts</p>
                </div>
              </div>
            </div>

            <div className="section-title mb-4">Employee Earnings Breakdown — {PERIOD_LABELS[period]}</div>

            {/* Employee List */}
            <div className="emp-stats-grid">
              {employeeStats.map(({ employee, totalHours, totalEarnings, pendingEarnings, approvedCount, pendingCount }) => (
                <button
                  key={employee.id}
                  className="emp-stat-card"
                  onClick={() => setSelectedEmp(employee.id)}
                >
                  <div className="emp-stat-header">
                    <div className="flex items-center gap-3">
                      {employee.avatarUrl ? (
                        <img src={employee.avatarUrl} alt={employee.name} className="emp-stat-avatar" />
                      ) : (
                        <div className="emp-stat-avatar emp-stat-avatar-initials">{employee.avatarInitials}</div>
                      )}
                      <div>
                        <p className="emp-stat-name">{employee.name}</p>
                        <p className="emp-stat-role">{employee.role}</p>
                      </div>
                    </div>
                    <ChevronRight size={18} style={{ color: "var(--cream-muted)" }} />
                  </div>

                  <div className="emp-stat-divider" />

                  <div className="emp-stat-grid">
                    <div className="emp-stat-item">
                      <DollarSign size={14} className="emp-stat-icon" />
                      <div>
                        <p className="emp-stat-label">Approved Earnings</p>
                        <p className="emp-stat-value emp-stat-value-primary">{formatMoney(totalEarnings)}</p>
                      </div>
                    </div>
                    <div className="emp-stat-item">
                      <Clock size={14} className="emp-stat-icon" />
                      <div>
                        <p className="emp-stat-label">Hours Worked</p>
                        <p className="emp-stat-value">{formatDuration(totalHours)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="emp-stat-grid">
                    <div className="emp-stat-item">
                      <Calendar size={14} className="emp-stat-icon" />
                      <div>
                        <p className="emp-stat-label">Approved Shifts</p>
                        <p className="emp-stat-value">{approvedCount}</p>
                      </div>
                    </div>
                    {pendingCount > 0 && (
                      <div className="emp-stat-item">
                        <Clock size={14} className="emp-stat-icon amber" />
                        <div>
                          <p className="emp-stat-label">Pending</p>
                          <p className="emp-stat-value emp-stat-value-amber">{pendingCount} shifts · {formatMoney(pendingEarnings)}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="emp-stat-footer">
                    <span style={{ fontSize: "0.7rem", color: "var(--cream-muted)", letterSpacing: "0.05em" }}>
                      Hourly Rate: {formatMoney(employee.hourlyRate)}/hr
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {employeeStats.length === 0 && (
              <div className="empty-state">
                <p style={{ color: "var(--cream-muted)", textAlign: "center" }}>
                  No approved shifts found for the selected period.
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Employee Detail View */}
            <button className="back-btn" onClick={() => setSelectedEmp(null)}>
              ← Back to All Employees
            </button>

            {selectedEmployee && selectedStats && (
              <>
                <div className="emp-detail-header">
                  <div className="flex items-center gap-4">
                    {selectedEmployee.avatarUrl ? (
                      <img src={selectedEmployee.avatarUrl} alt={selectedEmployee.name} className="emp-detail-avatar" />
                    ) : (
                      <div className="emp-detail-avatar emp-detail-avatar-initials">{selectedEmployee.avatarInitials}</div>
                    )}
                    <div>
                      <h2 className="emp-detail-name">{selectedEmployee.name}</h2>
                      <p className="emp-detail-role">{selectedEmployee.role} · {formatMoney(selectedEmployee.hourlyRate)}/hr</p>
                      <div className="emp-detail-badges">
                        <span className={`status-badge ${selectedEmployee.isActive ? "badge-approved" : "badge-declined"}`}>
                          {selectedEmployee.isActive ? "Active" : "Inactive"}
                        </span>
                        <span className="emp-detail-badge">{selectedStats.allTimeShifts} shifts all-time</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats for selected employee */}
                <div className="stats-grid mb-6">
                  <div className="stat-card stat-card-green">
                    <div className="stat-icon"><DollarSign size={20} /></div>
                    <div>
                      <p className="stat-label">Owed ({PERIOD_LABELS[period]})</p>
                      <p className="stat-value">{formatMoney(selectedStats.totalEarnings)}</p>
                      <p className="stat-sub">{selectedStats.approvedCount} approved shifts</p>
                    </div>
                  </div>
                  <div className="stat-card stat-card-blue">
                    <div className="stat-icon"><Clock size={20} /></div>
                    <div>
                      <p className="stat-label">Hours Worked</p>
                      <p className="stat-value">{formatDuration(selectedStats.totalHours)}</p>
                      <p className="stat-sub">Approved hours only</p>
                    </div>
                  </div>
                  {selectedStats.pendingCount > 0 && (
                    <div className="stat-card stat-card-amber">
                      <div className="stat-icon"><Clock size={20} /></div>
                      <div>
                        <p className="stat-label">Pending Review</p>
                        <p className="stat-value">{formatMoney(selectedStats.pendingEarnings)}</p>
                        <p className="stat-sub">{selectedStats.pendingCount} shifts · {formatDuration(selectedStats.pendingHours)}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="section-title mb-4">Shift History — {PERIOD_LABELS[period]}</div>

                {/* Shifts Table */}
                <div className="haven-table-wrap">
                  <table className="haven-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Clock In</th>
                        <th>Clock Out</th>
                        <th>Duration</th>
                        <th>Earnings</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedShifts.map(shift => (
                        <tr key={shift.id}>
                          <td>{new Date(shift.clockIn).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</td>
                          <td>{formatDateTime(shift.clockIn)}</td>
                          <td>{shift.clockOut ? formatDateTime(shift.clockOut) : "—"}</td>
                          <td>{shift.totalMinutes !== null ? formatDuration(shift.totalMinutes) : "—"}</td>
                          <td>
                            <span className={shift.status === "approved" ? "text-green" : ""}>
                              {shift.earnings !== null ? formatMoney(shift.earnings) : "—"}
                            </span>
                          </td>
                          <td><StatusBadge status={shift.status} /></td>
                        </tr>
                      ))}
                      {selectedShifts.length === 0 && (
                        <tr><td colSpan={6} className="empty-row">No shifts found for this period.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
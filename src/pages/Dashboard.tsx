import { useQuery } from "@tanstack/react-query";
import { getEmployees, getShifts, formatMoney, formatDuration } from "@/lib/store";
import { useAuth } from "@/context/AuthContext";
import { Users, Clock, DollarSign, CheckCircle, TrendingUp, AlertCircle } from "lucide-react";
import AppShell from "@/components/AppShell";
import StoreEarningsOverview from "@/components/StoreEarningsOverview";

function getWeekStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export default function Dashboard() {
  const { user, isOwnerOrManager } = useAuth();

  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: getEmployees });
  const { data: shifts = [] } = useQuery({ queryKey: ["shifts"], queryFn: getShifts });

  const weekStart = getWeekStart();

  const myShifts = shifts.filter(s => s.employeeId === user?.id);
  const activeEmployees = employees.filter(e => e.isActive);

  // Weekly filters
  const weekShifts = shifts.filter(s => s.clockOut !== null && new Date(s.clockOut!) >= weekStart);
  const approvedWeekShifts = weekShifts.filter(s => s.status === "approved");
  const pendingWeekShifts = weekShifts.filter(s => s.status === "pending");

  const weekPayroll = approvedWeekShifts.reduce((sum, s) => sum + (s.earnings ?? 0), 0);
  const weekPendingPayroll = pendingWeekShifts.reduce((sum, s) => sum + (s.earnings ?? 0), 0);

  // All shifts (for table) - removed unused variables

  const myEarnings = myShifts.filter(s => s.status === "approved").reduce((sum, s) => sum + (s.earnings ?? 0), 0);
  const myHours = myShifts.filter(s => s.status === "approved").reduce((sum, s) => sum + (s.totalMinutes ?? 0), 0);
  const myPending = myShifts.filter(s => s.status === "pending" && s.clockOut !== null).length;

  return (
    <AppShell>
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">
              {isOwnerOrManager ? "Business overview & operations summary" : `Welcome back, ${user?.name.split(" ")[0]}`}
            </p>
          </div>
          <div className="haven-badge">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
        </div>

        {isOwnerOrManager ? (
          <>
            <div className="stats-grid">
              <StatCard icon={<Users size={20} />} label="Active Staff" value={activeEmployees.length.toString()} sub={`${employees.length} total employees`} color="blue" />
              <StatCard icon={<CheckCircle size={20} />} label="Weekly Payroll" value={formatMoney(weekPayroll)} sub="Approved earnings this week" color="green" />
              <StatCard icon={<AlertCircle size={20} />} label="Pending Shifts" value={pendingWeekShifts.length.toString()} sub={`${formatMoney(weekPendingPayroll)} awaiting approval`} color="amber" />
              <StatCard icon={<TrendingUp size={20} />} label="Weekly Shifts" value={weekShifts.length.toString()} sub="Completed shifts this week" color="purple" />
            </div>

            <StoreEarningsOverview />

            <div className="section-title mt-8 mb-4">Recent Shift Activity</div>
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
                  </tr>
                </thead>
                <tbody>
                  {[...shifts].filter(s => s.clockOut !== null).sort((a, b) => new Date(b.clockOut!).getTime() - new Date(a.clockOut!).getTime()).slice(0, 5).map(shift => {
                    const emp = employees.find(e => e.id === shift.employeeId);
                    return (
                      <tr key={shift.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="avatar-sm">{emp?.avatarInitials}</div>
                            <span>{emp?.name ?? "Unknown"}</span>
                          </div>
                        </td>
                        <td>{formatDateTime(shift.clockIn)}</td>
                        <td>{shift.clockOut ? formatDateTime(shift.clockOut) : "—"}</td>
                        <td>{shift.totalMinutes !== null ? formatDuration(shift.totalMinutes) : "—"}</td>
                        <td>{shift.earnings !== null ? formatMoney(shift.earnings) : "—"}</td>
                        <td><StatusBadge status={shift.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <div className="stats-grid">
              <StatCard icon={<DollarSign size={20} />} label="Approved Earnings" value={formatMoney(myEarnings)} sub="Total earned (approved)" color="green" />
              <StatCard icon={<Clock size={20} />} label="Hours Worked" value={formatDuration(myHours)} sub="All approved shifts" color="blue" />
              <StatCard icon={<AlertCircle size={20} />} label="Pending Shifts" value={myPending.toString()} sub="Awaiting manager approval" color="amber" />
              <StatCard icon={<CheckCircle size={20} />} label="Total Shifts" value={myShifts.filter(s => s.clockOut !== null).length.toString()} sub="Completed shifts" color="purple" />
            </div>

            <div className="section-title mt-8 mb-4">My Recent Shifts</div>
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
                  {myShifts.filter(s => s.clockOut !== null).sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime()).slice(0, 8).map(shift => (
                    <tr key={shift.id}>
                      <td>{new Date(shift.clockIn).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                      <td>{formatDateTime(shift.clockIn)}</td>
                      <td>{shift.clockOut ? formatDateTime(shift.clockOut) : "—"}</td>
                      <td>{shift.totalMinutes !== null ? formatDuration(shift.totalMinutes) : "—"}</td>
                      <td>{shift.earnings !== null ? formatMoney(shift.earnings) : "—"}</td>
                      <td><StatusBadge status={shift.status} /></td>
                    </tr>
                  ))}
                  {myShifts.filter(s => s.clockOut !== null).length === 0 && (
                    <tr><td colSpan={6} className="empty-row">No shifts recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color: string }) {
  return (
    <div className={`stat-card stat-card-${color}`}>
      <div className="stat-icon">{icon}</div>
      <div>
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
        <p className="stat-sub">{sub}</p>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: "badge-approved",
    pending: "badge-pending",
    declined: "badge-declined",
  };
  return <span className={`status-badge ${map[status] ?? ""}`}>{status}</span>;
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}
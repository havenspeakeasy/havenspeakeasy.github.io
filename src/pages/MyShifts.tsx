import { useQuery } from "@tanstack/react-query";
import { getShifts, formatDuration, formatMoney } from "@/lib/store";
import { useAuth } from "@/context/AuthContext";
import AppShell from "@/components/AppShell";
import { StatusBadge, formatDateTime } from "./Dashboard";
import { Clock, DollarSign, CheckCircle, XCircle } from "lucide-react";

export default function MyShifts() {
  const { user } = useAuth();
  const { data: shifts = [], isLoading } = useQuery({ queryKey: ["shifts"], queryFn: getShifts });

  const myShifts = shifts
    .filter(s => s.employeeId === user?.id && s.clockOut !== null)
    .sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());

  const approved = myShifts.filter(s => s.status === "approved");
  const pending = myShifts.filter(s => s.status === "pending");
  const declined = myShifts.filter(s => s.status === "declined");

  const totalEarned = approved.reduce((sum, s) => sum + (s.earnings ?? 0), 0);
  const totalHours = approved.reduce((sum, s) => sum + (s.totalMinutes ?? 0), 0);

  return (
    <AppShell>
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">My Shifts</h1>
            <p className="page-subtitle">Your complete shift history and earnings</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mini-stats-row">
          <div className="mini-stat">
            <CheckCircle size={16} className="mini-stat-icon green" />
            <div>
              <p className="mini-stat-label">Approved</p>
              <p className="mini-stat-val">{approved.length} shifts</p>
            </div>
          </div>
          <div className="mini-stat">
            <Clock size={16} className="mini-stat-icon amber" />
            <div>
              <p className="mini-stat-label">Pending</p>
              <p className="mini-stat-val">{pending.length} shifts</p>
            </div>
          </div>
          <div className="mini-stat">
            <XCircle size={16} className="mini-stat-icon red" />
            <div>
              <p className="mini-stat-label">Declined</p>
              <p className="mini-stat-val">{declined.length} shifts</p>
            </div>
          </div>
          <div className="mini-stat">
            <DollarSign size={16} className="mini-stat-icon gold" />
            <div>
              <p className="mini-stat-label">Total Earned</p>
              <p className="mini-stat-val">{formatMoney(totalEarned)}</p>
            </div>
          </div>
          <div className="mini-stat">
            <Clock size={16} className="mini-stat-icon blue" />
            <div>
              <p className="mini-stat-label">Hours Worked</p>
              <p className="mini-stat-val">{formatDuration(totalHours)}</p>
            </div>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="loading-state">Loading shifts...</div>
        ) : (
          <div className="haven-table-wrap">
            <table className="haven-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Clock In</th>
                  <th>Clock Out</th>
                  <th>Duration</th>
                  <th>Gross Earnings</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {myShifts.map(shift => (
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
                {myShifts.length === 0 && (
                  <tr><td colSpan={6} className="empty-row">No completed shifts yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}

import { useQuery } from "@tanstack/react-query";
import { getMyEarningsLogs } from "@/lib/earningsStore";
import { useAuth } from "@/context/AuthContext";
import { DollarSign, Lock, FileText } from "lucide-react";

export default function EarningsLogTable() {
  const { user } = useAuth();
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["earnings-logs", user?.id],
    queryFn: () => getMyEarningsLogs(user!.id),
    enabled: !!user,
  });

  if (isLoading) return <div className="loading-state">Loading cash logs...</div>;

  return (
    <div className="earnings-log-section">
      <div className="section-title mb-3 flex items-center gap-2">
        <DollarSign size={16} style={{ color: "var(--gold)" }} />
        My Cash Logs
      </div>

      {logs.length === 0 ? (
        <div className="earnings-empty">
          <FileText size={28} style={{ color: "var(--cream-muted)", opacity: 0.4 }} />
          <p>No cash logs recorded yet.</p>
          <p className="earnings-empty-sub">Your end-of-shift cash counts will appear here.</p>
        </div>
      ) : (
        <div className="haven-table-wrap">
          <table className="haven-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Denominations</th>
                <th>Total Cash</th>
                <th>Note</th>
                <th>Safe</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td>
                    {new Date(log.submittedAt).toLocaleDateString("en-US", {
                      weekday: "short", month: "short", day: "numeric",
                    })}
                    <span className="denom-time">
                      {new Date(log.submittedAt).toLocaleTimeString("en-US", {
                        hour: "numeric", minute: "2-digit", hour12: true,
                      })}
                    </span>
                  </td>
                  <td>
                    <div className="denom-pills">
                      {log.denominations.filter(d => d.count > 0).map(d => (
                        <span key={d.label} className="denom-pill">
                          {d.count}× {d.label}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className="cash-log-total">${log.totalCash.toFixed(2)}</span>
                  </td>
                  <td>
                    <span style={{ color: "var(--cream-muted)", fontSize: "0.8rem" }}>
                      {log.note || "—"}
                    </span>
                  </td>
                  <td>
                    {log.safeConfirmed ? (
                      <span className="safe-badge safe-badge-confirmed">
                        <Lock size={11} /> Confirmed
                      </span>
                    ) : (
                      <span className="safe-badge safe-badge-pending">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

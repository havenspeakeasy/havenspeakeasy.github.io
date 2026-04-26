import { useQuery } from "@tanstack/react-query";
import { getEarningsLogs } from "@/lib/earningsStore";
import { getEmployees } from "@/lib/store";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DollarSign, TrendingUp, Wallet, Calendar } from "lucide-react";

function getWeekStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  // Calculate days since Monday (0 = Monday, 6 = Sunday)
  const dayOfWeek = d.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  d.setDate(d.getDate() - daysSinceMonday);
  return d;
}

// Build last 7 days labels + totals from logs
function buildDailyData(logs: { submittedAt: string; totalCash: number }[]) {
  const days: { label: string; date: Date; total: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    days.push({
      label: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      date: d,
      total: 0,
    });
  }
  logs.forEach(log => {
    const submitted = new Date(log.submittedAt);
    submitted.setHours(0, 0, 0, 0);
    const match = days.find(d => d.date.getTime() === submitted.getTime());
    if (match) match.total += log.totalCash;
  });
  return days.map(d => ({ label: d.label, total: parseFloat(d.total.toFixed(2)) }));
}

// Build top earners by total cash submitted this week
function buildTopStaff(logs: { employeeId: string; totalCash: number; submittedAt: string }[], employees: { id: string; name: string; avatarInitials: string }[], weekStart: Date) {
  const weekLogs = logs.filter(l => new Date(l.submittedAt) >= weekStart);
  const map: Record<string, number> = {};
  weekLogs.forEach(l => { map[l.employeeId] = (map[l.employeeId] ?? 0) + l.totalCash; });
  return Object.entries(map)
    .map(([id, total]) => {
      const emp = employees.find(e => e.id === id);
      return { name: emp?.name ?? "Unknown", initials: emp?.avatarInitials ?? "?", total: parseFloat(total.toFixed(2)) };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="earnings-chart-tooltip">
        <p className="tooltip-label">{label}</p>
        <p className="tooltip-value">${payload[0].value.toFixed(2)}</p>
      </div>
    );
  }
  return null;
};

export default function StoreEarningsOverview() {
  const { data: logs = [] } = useQuery({ queryKey: ["earnings-logs-all"], queryFn: getEarningsLogs });
  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: getEmployees });

  const weekStart = getWeekStart();
  const weekLogs = logs.filter(l => new Date(l.submittedAt) >= weekStart);
  const allTimeLogs = logs;

  const weekTotal = weekLogs.reduce((s, l) => s + l.totalCash, 0);
  const weekAvg = weekLogs.length > 0 ? weekTotal / weekLogs.length : 0;
  const allTimeTotal = allTimeLogs.reduce((s, l) => s + l.totalCash, 0);
  const safeConfirmedCount = weekLogs.filter(l => l.safeConfirmed).length;

  const dailyData = buildDailyData(logs);
  const topStaff = buildTopStaff(logs, employees, weekStart);
  const maxStaffTotal = topStaff[0]?.total ?? 1;

  return (
    <div className="store-earnings-overview">
      {/* Section Header */}
      <div className="overview-section-header">
        <div className="overview-section-title">
          <Wallet size={16} style={{ color: "var(--gold)" }} />
          Store Cash Earnings
        </div>
        <span className="overview-week-badge">
          <Calendar size={12} />
          This Week
        </span>
      </div>

      {/* Summary Stats */}
      <div className="earnings-overview-stats">
        <div className="eo-stat">
          <div className="eo-stat-icon eo-stat-gold">
            <DollarSign size={18} />
          </div>
          <div>
            <p className="eo-stat-label">Weekly Cash In</p>
            <p className="eo-stat-val">${weekTotal.toFixed(2)}</p>
            <p className="eo-stat-sub">{weekLogs.length} log{weekLogs.length !== 1 ? "s" : ""} submitted</p>
          </div>
        </div>
        <div className="eo-stat">
          <div className="eo-stat-icon eo-stat-green">
            <TrendingUp size={18} />
          </div>
          <div>
            <p className="eo-stat-label">Avg Per Log</p>
            <p className="eo-stat-val">${weekAvg.toFixed(2)}</p>
            <p className="eo-stat-sub">This week average</p>
          </div>
        </div>
        <div className="eo-stat">
          <div className="eo-stat-icon eo-stat-blue">
            <Wallet size={18} />
          </div>
          <div>
            <p className="eo-stat-label">All-Time Cash</p>
            <p className="eo-stat-val">${allTimeTotal.toFixed(2)}</p>
            <p className="eo-stat-sub">{allTimeLogs.length} total logs</p>
          </div>
        </div>
        <div className="eo-stat">
          <div className="eo-stat-icon eo-stat-amber">
            <Calendar size={18} />
          </div>
          <div>
            <p className="eo-stat-label">Safe Confirmations</p>
            <p className="eo-stat-val">{safeConfirmedCount}/{weekLogs.length}</p>
            <p className="eo-stat-sub">Confirmed this week</p>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="earnings-charts-row">
        {/* Area chart: daily totals */}
        <div className="earnings-chart-card earnings-chart-wide">
          <p className="chart-card-title">Daily Cash (Last 7 Days)</p>
          {logs.length === 0 ? (
            <div className="chart-empty">No cash logs recorded yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c9a84c" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#c9a84c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--cream-muted)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => v.split(",")[0]}
                />
                <YAxis
                  tick={{ fill: "var(--cream-muted)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${v}`}
                  width={55}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#c9a84c"
                  strokeWidth={2}
                  fill="url(#cashGradient)"
                  dot={{ fill: "#c9a84c", r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "#c9a84c" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bar chart: top staff by cash */}
        <div className="earnings-chart-card">
          <p className="chart-card-title">Top Staff This Week</p>
          {topStaff.length === 0 ? (
            <div className="chart-empty">No submissions this week.</div>
          ) : (
            <div className="top-staff-list">
              {topStaff.map((s, i) => (
                <div key={s.name} className="top-staff-row">
                  <div className="top-staff-rank">{i + 1}</div>
                  <div className="avatar-sm">{s.initials}</div>
                  <div className="top-staff-info">
                    <p className="top-staff-name">{s.name}</p>
                    <div className="top-staff-bar-wrap">
                      <div
                        className="top-staff-bar"
                        style={{ width: `${(s.total / maxStaffTotal) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="top-staff-amount">${s.total.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
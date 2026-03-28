import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { clockIn, clockOut, getActiveShift, formatMoney } from "@/lib/store";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Clock, LogIn, LogOut, Timer } from "lucide-react";
import AppShell from "@/components/AppShell";
import CashCountModal from "@/components/CashCountModal";
import EarningsLogTable from "@/components/EarningsLogTable";

export default function ClockPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [clocked, setClocked] = useState(false);
  const [clockInTime, setClockInTime] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lastShift, setLastShift] = useState<{ id: string; duration: number; earnings: number } | null>(null);
  const [showCashModal, setShowCashModal] = useState(false);

  // On mount, check if there's an active shift in the database
  useEffect(() => {
    if (!user) return;
    getActiveShift(user.id).then((shift) => {
      if (shift) {
        setClocked(true);
        setClockInTime(new Date(shift.clockIn));
      }
    }).catch(console.error);
  }, [user]);

  useEffect(() => {
    if (!clocked || !clockInTime) return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - clockInTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [clocked, clockInTime]);

  const handleClockIn = async () => {
    if (!user) return;
    setLoading(true);
    const shift = await clockIn(user.id).catch(err => { toast.error(err.message); return null; });
    setLoading(false);
    if (shift) {
      setClocked(true);
      setClockInTime(new Date(shift.clockIn));
      setElapsed(0);
      setLastShift(null);
      toast.success("You're now clocked in. Have a great shift!");
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    }
  };

  const handleClockOut = async () => {
    if (!user) return;
    setLoading(true);
    const shift = await clockOut(user.id).catch(err => { toast.error(err.message); return null; });
    setLoading(false);
    if (shift) {
      setClocked(false);
      setClockInTime(null);
      setElapsed(0);
      setLastShift({ id: shift.id, duration: shift.totalMinutes ?? 0, earnings: shift.earnings ?? 0 });
      toast.success("Clocked out! Please count your cash below.");
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      // Automatically open cash count modal
      setShowCashModal(true);
    }
  };

  const formatElapsed = (secs: number) => {
    const h = Math.floor(secs / 3600).toString().padStart(2, "0");
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const estimatedEarnings = user && clockInTime
    ? (elapsed / 3600) * user.hourlyRate
    : 0;

  return (
    <AppShell>
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Clock In / Out</h1>
            <p className="page-subtitle">Track your shift hours in real time</p>
          </div>
        </div>

        <div className="clock-center">
          {/* Clock Display */}
          <div className={`clock-card ${clocked ? "clock-card-active" : "clock-card-idle"}`}>
            <div className="clock-icon-ring">
              {clocked ? <Timer size={32} style={{ color: "var(--gold)" }} /> : <Clock size={32} style={{ color: "var(--gold)" }} />}
            </div>

            <div className="clock-status-label">
              {clocked ? "Currently On Shift" : "Not Clocked In"}
            </div>

            {clocked && (
              <>
                <div className="clock-timer">{formatElapsed(elapsed)}</div>
                <div className="clock-estimate">
                  Est. Earnings: <strong>{formatMoney(estimatedEarnings)}</strong>
                </div>
                {clockInTime && (
                  <div className="clock-since">
                    Clocked in at {clockInTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                  </div>
                )}
              </>
            )}

            {!clocked && !lastShift && (
              <p className="clock-idle-text">Press the button below to start your shift.</p>
            )}

            {/* Action button */}
            <button
              className={clocked ? "haven-btn-danger" : "haven-btn-primary"}
              onClick={clocked ? handleClockOut : handleClockIn}
              disabled={loading}
            >
              {clocked ? (
                <><LogOut size={18} /> {loading ? "Clocking Out..." : "Clock Out"}</>
              ) : (
                <><LogIn size={18} /> {loading ? "Clocking In..." : "Clock In"}</>
              )}
            </button>
          </div>

          {/* Last shift summary */}
          {lastShift && !clocked && (
            <div className="last-shift-card">
              <h3 className="last-shift-title">Last Shift Summary</h3>
              <div className="last-shift-grid">
                <div className="last-shift-item">
                  <span className="last-shift-label">Duration</span>
                  <span className="last-shift-value">
                    {Math.floor(lastShift.duration / 60)}h {lastShift.duration % 60}m
                  </span>
                </div>
                <div className="last-shift-item">
                  <span className="last-shift-label">Gross Earnings</span>
                  <span className="last-shift-value">{formatMoney(lastShift.earnings)}</span>
                </div>
              </div>
              <p className="last-shift-note">Shift submitted for manager approval.</p>
              <button
                className="haven-btn-primary mt-3"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => setShowCashModal(true)}
              >
                Count Cash / Log Earnings
              </button>
            </div>
          )}

          {/* Info */}
          <div className="clock-info-box">
            <p className="clock-info-title">How it works</p>
            <ul className="clock-info-list">
              <li>Clock in when your shift starts — the timer runs automatically.</li>
              <li>Clock out at the end of your shift to log your hours.</li>
              <li>After clocking out, count your cash and confirm the safe deposit.</li>
              <li>Approved shifts count toward your salary calculations.</li>
            </ul>
          </div>
        </div>

        {/* Cash Logs History */}
        <EarningsLogTable />
      </div>

      {/* Cash Count Modal */}
      {showCashModal && lastShift && (
        <CashCountModal
          shiftId={lastShift.id}
          onClose={() => setShowCashModal(false)}
        />
      )}
    </AppShell>
  );
}

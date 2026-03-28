import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { addEarningsLog, freshDenominations, type CashDenomination } from "@/lib/earningsStore";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Lock, DollarSign, AlertTriangle, X, ChevronUp, ChevronDown, CheckCircle } from "lucide-react";

interface Props {
  shiftId: string;
  onClose: () => void;
}

export default function CashCountModal({ shiftId, onClose }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [denoms, setDenoms] = useState<CashDenomination[]>(freshDenominations());
  const [note, setNote] = useState("");
  const [safeConfirmed, setSafeConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"count" | "confirm">("count");

  const totalCash = denoms.reduce((sum, d) => sum + d.value * d.count, 0);

  const updateCount = (index: number, delta: number) => {
    setDenoms(prev => prev.map((d, i) => i === index
      ? { ...d, count: Math.max(0, d.count + delta) }
      : d
    ));
  };

  const handleCountInput = (index: number, raw: string) => {
    const val = parseInt(raw, 10);
    setDenoms(prev => prev.map((d, i) => i === index
      ? { ...d, count: isNaN(val) || val < 0 ? 0 : val }
      : d
    ));
  };

  const handleSubmit = async () => {
    if (!safeConfirmed) {
      toast.error("Please confirm the cash has been placed in the business safe.");
      return;
    }
    if (!user) return;
    setLoading(true);
    await addEarningsLog({
      employeeId: user.id,
      shiftId,
      denominations: denoms,
      totalCash: parseFloat(totalCash.toFixed(2)),
      note,
      safeConfirmed,
    });
    qc.invalidateQueries({ queryKey: ["earnings-logs"] });
    toast.success("Cash log submitted. Safe secured!");
    setLoading(false);
    onClose();
  };

  const hasAnyCash = denoms.some(d => d.count > 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box cash-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="cash-modal-icon">
              <DollarSign size={18} style={{ color: "var(--gold)" }} />
            </div>
            <div>
              <h2 className="modal-title">End-of-Shift Cash Count</h2>
              <p className="modal-subtitle">Record the cash taken during your shift</p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {step === "count" ? (
          <>
            <div className="modal-body">
              {/* Safe reminder banner */}
              <div className="safe-reminder-banner">
                <Lock size={16} style={{ color: "var(--gold)", flexShrink: 0 }} />
                <p>All cash must be counted and placed in the <strong>business safe</strong> before leaving the premises.</p>
              </div>

              {/* Denomination grid */}
              <div className="denom-section-title">Count each denomination</div>
              <div className="denom-grid">
                {denoms.map((d, i) => (
                  <div key={d.label} className={`denom-row ${d.count > 0 ? "denom-row-active" : ""}`}>
                    <span className="denom-label">{d.label}</span>
                    <div className="denom-controls">
                      <button className="denom-btn" onClick={() => updateCount(i, -1)} tabIndex={-1}>
                        <ChevronDown size={14} />
                      </button>
                      <input
                        className="denom-input"
                        type="number"
                        min={0}
                        value={d.count}
                        onChange={e => handleCountInput(i, e.target.value)}
                      />
                      <button className="denom-btn" onClick={() => updateCount(i, 1)} tabIndex={-1}>
                        <ChevronUp size={14} />
                      </button>
                    </div>
                    <span className="denom-subtotal">
                      {d.count > 0 ? `$${(d.value * d.count).toFixed(2)}` : "—"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="cash-total-bar">
                <span className="cash-total-label">Total Cash</span>
                <span className="cash-total-value">${totalCash.toFixed(2)}</span>
              </div>

              {/* Note */}
              <div className="form-row mt-4">
                <label className="form-label">Notes (optional)</label>
                <input
                  className="haven-input-sm"
                  placeholder="e.g. Busy night, included tips, bar only..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="haven-btn-ghost" onClick={onClose}>Skip for Now</button>
              <button
                className="haven-btn-primary"
                onClick={() => setStep("confirm")}
                disabled={!hasAnyCash}
              >
                Continue to Safe Confirmation
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="modal-body">
              {/* Summary */}
              <div className="cash-confirm-summary">
                <div className="cash-confirm-amount">${totalCash.toFixed(2)}</div>
                <p className="cash-confirm-label">Total cash counted this shift</p>
              </div>

              {/* Breakdown */}
              <div className="cash-breakdown">
                {denoms.filter(d => d.count > 0).map(d => (
                  <div key={d.label} className="cash-breakdown-row">
                    <span>{d.count}× {d.label}</span>
                    <span>${(d.value * d.count).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {note && (
                <div className="cash-note-preview">
                  <span className="cash-note-chip">Note:</span> {note}
                </div>
              )}

              {/* Safe confirmation */}
              <div className="safe-confirm-box">
                <AlertTriangle size={20} style={{ color: "var(--gold)", flexShrink: 0 }} />
                <div>
                  <p className="safe-confirm-title">Business Safe Reminder</p>
                  <p className="safe-confirm-text">
                    Place all <strong>${totalCash.toFixed(2)}</strong> in the designated business safe before leaving. Do not take cash off-premises.
                  </p>
                  <label className="safe-checkbox-label">
                    <input
                      type="checkbox"
                      className="safe-checkbox"
                      checked={safeConfirmed}
                      onChange={e => setSafeConfirmed(e.target.checked)}
                    />
                    <span>I confirm the cash has been placed in the business safe</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="haven-btn-ghost" onClick={() => setStep("count")}>
                Back to Count
              </button>
              <button
                className="haven-btn-primary"
                onClick={handleSubmit}
                disabled={loading || !safeConfirmed}
              >
                {loading ? "Submitting..." : (
                  <><CheckCircle size={16} /> Submit & Confirm Safe</>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getInjuryReports, updateInjuryReportStatus,
  type InjuryReport, type InjuryStatus,
} from "@/lib/injuryStore";
import { getEmployees } from "@/lib/store";
import AppShell from "@/components/AppShell";
import { toast } from "sonner";
import {
  AlertTriangle, Check, X,
  Stethoscope, FileText, Clock4, DollarSign,
  ShieldAlert, Users,
} from "lucide-react";

type FilterType = "all" | "pending" | "approved" | "declined";

export default function ManageInjuries() {
  const qc = useQueryClient();
  const { data: reports = [] } = useQuery({ queryKey: ["injury-reports-all"], queryFn: getInjuryReports });
  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: getEmployees });
  const [filter, setFilter] = useState<FilterType>("pending");
  const [noteModal, setNoteModal] = useState<{ report: InjuryReport; action: InjuryStatus } | null>(null);
  const [managerNote, setManagerNote] = useState("");

  const getEmployee = (id: string) => employees.find(e => e.id === id);

  const filtered = reports
    .filter(r => filter === "all" || r.status === filter)
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  const pending = reports.filter(r => r.status === "pending");
  const approved = reports.filter(r => r.status === "approved");
  const totalClaimed = reports
    .filter(r => r.medicalCost !== null)
    .reduce((sum, r) => sum + (r.medicalCost ?? 0), 0);
  const totalReimbursed = approved
    .filter(r => r.medicalCost !== null)
    .reduce((sum, r) => sum + (r.medicalCost ?? 0), 0);

  const openDecide = (report: InjuryReport, action: InjuryStatus) => {
    setManagerNote("");
    setNoteModal({ report, action });
  };

  const handleDecide = async () => {
    if (!noteModal) return;
    await updateInjuryReportStatus(noteModal.report.id, noteModal.action, managerNote);
    toast.success(`Report ${noteModal.action}.`);
    qc.invalidateQueries({ queryKey: ["injury-reports-all"] });
    qc.invalidateQueries({ queryKey: ["injury-reports"] });
    setNoteModal(null);
  };

  return (
    <AppShell>
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Injury Reports</h1>
            <p className="page-subtitle">Review staff injury reports and process reimbursements</p>
          </div>
          {pending.length > 0 && (
            <div className="injury-alert-badge">
              <ShieldAlert size={15} />
              {pending.length} pending review
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="stats-grid mb-6">
          <div className="stat-card stat-card-amber">
            <div className="stat-icon"><Clock4 size={20} /></div>
            <div>
              <p className="stat-label">Pending Review</p>
              <p className="stat-value">{pending.length}</p>
              <p className="stat-sub">Require your attention</p>
            </div>
          </div>
          <div className="stat-card stat-card-green">
            <div className="stat-icon"><DollarSign size={20} /></div>
            <div>
              <p className="stat-label">Reimbursed</p>
              <p className="stat-value">${totalReimbursed.toFixed(2)}</p>
              <p className="stat-sub">Across {approved.length} approved reports</p>
            </div>
          </div>
          <div className="stat-card stat-card-blue">
            <div className="stat-icon"><FileText size={20} /></div>
            <div>
              <p className="stat-label">Total Claimed</p>
              <p className="stat-value">${totalClaimed.toFixed(2)}</p>
              <p className="stat-sub">All medical costs submitted</p>
            </div>
          </div>
          <div className="stat-card stat-card-purple">
            <div className="stat-icon"><Users size={20} /></div>
            <div>
              <p className="stat-label">Total Reports</p>
              <p className="stat-value">{reports.length}</p>
              <p className="stat-sub">All-time injury reports</p>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="filters-row mb-4">
          <div className="filter-tabs">
            {(["pending", "approved", "declined", "all"] as FilterType[]).map(f => (
              <button
                key={f}
                className={`filter-tab ${filter === f ? "filter-tab-active" : ""}`}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f === "pending" && pending.length > 0 && (
                  <span className="filter-badge">{pending.length}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Reports */}
        {filtered.length === 0 ? (
          <div className="injury-empty">
            <AlertTriangle size={36} style={{ color: "var(--cream-muted)", marginBottom: "0.75rem" }} />
            <p>No reports match this filter.</p>
          </div>
        ) : (
          <div className="injury-cards-list">
            {filtered.map(report => {
              const emp = getEmployee(report.employeeId);
              return (
                <div key={report.id} className="injury-card injury-card-manager">
                  <div className="injury-card-header">
                    <div className="flex items-center gap-3">
                      {emp?.avatarUrl ? (
                        <div className="avatar-sm-photo">
                          <img src={emp.avatarUrl} alt={emp.name} />
                        </div>
                      ) : (
                        <div className="avatar-sm">{emp?.avatarInitials ?? "?"}</div>
                      )}
                      <div>
                        <p className="injury-card-title">{emp?.name ?? "Unknown"}</p>
                        <p className="injury-card-meta">{emp?.role} &middot; {report.injuryType}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`status-badge ${{
                          pending: "badge-pending",
                          approved: "badge-approved",
                          declined: "badge-declined",
                        }[report.status]}`}
                      >
                        {report.status}
                      </span>
                    </div>
                  </div>

                  <div className="injury-detail-grid">
                    <div className="injury-detail-item">
                      <span className="injury-detail-label">Date of Incident</span>
                      <span className="injury-detail-val">
                        {new Date(report.incidentDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                    <div className="injury-detail-item">
                      <span className="injury-detail-label">Location</span>
                      <span className="injury-detail-val">{report.location}</span>
                    </div>
                    <div className="injury-detail-item">
                      <span className="injury-detail-label">Medical Status</span>
                      <span className={`injury-chip ${report.medicalStatus === "received" ? "chip-green" : "chip-amber"}`} style={{ display: "inline-flex" }}>
                        <Stethoscope size={11} />
                        {report.medicalStatus === "received" ? "Care received" : "Awaiting care"}
                      </span>
                    </div>
                    <div className="injury-detail-item">
                      <span className="injury-detail-label">Medical Cost</span>
                      <span className="injury-detail-val" style={{ color: report.medicalCost ? "var(--gold)" : "var(--cream-muted)" }}>
                        {report.medicalCost !== null ? `$${report.medicalCost.toFixed(2)}` : "Not yet available"}
                      </span>
                    </div>
                  </div>

                  <div className="injury-card-desc" style={{ marginTop: "0.75rem" }}>
                    <span style={{ color: "var(--cream-muted)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Description</span>
                    <p style={{ marginTop: "0.25rem" }}>{report.description}</p>
                  </div>

                  {report.medicalNotes && (
                    <div className="injury-medical-notes">
                      <Stethoscope size={13} style={{ color: "var(--cream-muted)", flexShrink: 0 }} />
                      <span>{report.medicalNotes}</span>
                    </div>
                  )}

                  {report.managerNote && (
                    <div className="injury-manager-note">
                      <strong>Your Note:</strong> {report.managerNote}
                    </div>
                  )}

                  {report.status === "pending" && (
                    <div className="action-btns" style={{ marginTop: "1rem" }}>
                      <button
                        className="action-btn action-btn-approve"
                        onClick={() => openDecide(report, "approved")}
                      >
                        <Check size={14} /> Approve Reimbursement
                      </button>
                      <button
                        className="action-btn action-btn-decline"
                        onClick={() => openDecide(report, "declined")}
                      >
                        <X size={14} /> Decline
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Decision Modal */}
      {noteModal && (
        <div className="modal-overlay" onClick={() => setNoteModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {noteModal.action === "approved" ? "Approve Reimbursement" : "Decline Report"}
              </h2>
              <button className="icon-btn" onClick={() => setNoteModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: "var(--cream-muted)", fontSize: "0.875rem", marginBottom: "1rem" }}>
                {noteModal.action === "approved"
                  ? `You are approving a reimbursement${noteModal.report.medicalCost !== null ? ` of $${noteModal.report.medicalCost.toFixed(2)}` : ""} for ${getEmployee(noteModal.report.employeeId)?.name ?? "this employee"}.`
                  : `You are declining the injury report from ${getEmployee(noteModal.report.employeeId)?.name ?? "this employee"}.`
                }
              </p>
              <div className="form-row">
                <label className="form-label">Manager Note (optional)</label>
                <textarea
                  className="haven-input-sm haven-textarea"
                  rows={3}
                  placeholder="Add a note to the employee explaining your decision..."
                  value={managerNote}
                  onChange={e => setManagerNote(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="haven-btn-ghost" onClick={() => setNoteModal(null)}>Cancel</button>
              {noteModal.action === "approved" ? (
                <button className="action-btn action-btn-approve" style={{ padding: "0.5rem 1.25rem" }} onClick={handleDecide}>
                  <Check size={14} /> Confirm Approval
                </button>
              ) : (
                <button className="action-btn action-btn-decline" style={{ padding: "0.5rem 1.25rem" }} onClick={handleDecide}>
                  <X size={14} /> Confirm Decline
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMyInjuryReports, addInjuryReport,
  type InjuryReport, type MedicalStatus,
} from "@/lib/injuryStore";
import { useAuth } from "@/context/AuthContext";
import AppShell from "@/components/AppShell";
import { toast } from "sonner";
import {
  AlertTriangle, Plus, X, CheckCircle2, Clock4,
  XCircle, Activity, Stethoscope, FileText,
} from "lucide-react";

const INJURY_TYPES = [
  "Laceration", "Burn", "Bruise / Contusion", "Slip & Fall",
  "Strain / Sprain", "Altercation Injury", "Head Injury", "Other",
];

const LOCATIONS = [
  "Bar Counter", "Back Storage Room", "Entrance / Door",
  "Main Floor", "Kitchen / Staff Area", "Restrooms", "Parking Area", "Other",
];

interface FormState {
  incidentDate: string;
  location: string;
  description: string;
  injuryType: string;
  medicalStatus: MedicalStatus;
  medicalCost: string;
  medicalNotes: string;
}

function emptyForm(): FormState {
  return {
    incidentDate: "",
    location: "",
    description: "",
    injuryType: "",
    medicalStatus: "pending_care",
    medicalCost: "",
    medicalNotes: "",
  };
}

export default function InjuryReportPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["injury-reports", user?.id],
    queryFn: () => getMyInjuryReports(user!.id),
    enabled: !!user,
  });

  const set = (field: keyof FormState, val: string) =>
    setForm(f => ({ ...f, [field]: val }));

  const handleSubmit = async () => {
    if (!user) return;
    if (!form.incidentDate || !form.location || !form.description || !form.injuryType) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (form.medicalStatus === "received" && !form.medicalNotes.trim()) {
      toast.error("Please provide details about the medical care you received.");
      return;
    }
    setSaving(true);
    await addInjuryReport({
      employeeId: user.id,
      incidentDate: new Date(form.incidentDate).toISOString(),
      location: form.location,
      description: form.description,
      injuryType: form.injuryType,
      medicalStatus: form.medicalStatus,
      medicalCost: form.medicalStatus === "received" && form.medicalCost
        ? parseFloat(form.medicalCost)
        : null,
      medicalNotes: form.medicalNotes,
    });
    setSaving(false);
    toast.success("Injury report submitted. Management will review shortly.");
    qc.invalidateQueries({ queryKey: ["injury-reports"] });
    setShowModal(false);
    setForm(emptyForm());
  };

  const pending = reports.filter(r => r.status === "pending").length;
  const approved = reports.filter(r => r.status === "approved").length;
  const declined = reports.filter(r => r.status === "declined").length;
  const totalReimbursed = reports
    .filter(r => r.status === "approved" && r.medicalCost !== null)
    .reduce((sum, r) => sum + (r.medicalCost ?? 0), 0);

  return (
    <AppShell>
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Injury Reports</h1>
            <p className="page-subtitle">Report workplace injuries and track your reimbursements</p>
          </div>
          <button className="haven-btn-primary" onClick={() => { setForm(emptyForm()); setShowModal(true); }}>
            <Plus size={16} /> File a Report
          </button>
        </div>

        {/* Summary */}
        <div className="mini-stats-row mb-6">
          <div className="mini-stat">
            <Clock4 size={16} className="mini-stat-icon amber" />
            <div>
              <p className="mini-stat-label">Pending Review</p>
              <p className="mini-stat-val">{pending} report{pending !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <div className="mini-stat">
            <CheckCircle2 size={16} className="mini-stat-icon green" />
            <div>
              <p className="mini-stat-label">Approved</p>
              <p className="mini-stat-val">{approved} report{approved !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <div className="mini-stat">
            <XCircle size={16} className="mini-stat-icon red" />
            <div>
              <p className="mini-stat-label">Declined</p>
              <p className="mini-stat-val">{declined} report{declined !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <div className="mini-stat">
            <Stethoscope size={16} className="mini-stat-icon gold" />
            <div>
              <p className="mini-stat-label">Total Reimbursed</p>
              <p className="mini-stat-val">${totalReimbursed.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Report Cards */}
        {isLoading ? (
          <div className="loading-state">Loading reports...</div>
        ) : reports.length === 0 ? (
          <div className="injury-empty">
            <Activity size={40} style={{ color: "var(--cream-muted)", marginBottom: "1rem" }} />
            <p>No injury reports filed yet.</p>
            <p style={{ fontSize: "0.8rem", color: "var(--cream-muted)", marginTop: "0.25rem" }}>
              If you've been injured at work, please file a report immediately.
            </p>
          </div>
        ) : (
          <div className="injury-cards-list">
            {reports.map(report => (
              <InjuryCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </div>

      {/* Submit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} style={{ color: "var(--status-red)" }} />
                <h2 className="modal-title">File Injury Report</h2>
              </div>
              <button className="icon-btn" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>

            <div className="modal-body">
              {/* Incident Details */}
              <div className="form-section-label">Incident Details</div>
              <div className="form-row-2col">
                <div className="form-row">
                  <label className="form-label">Date of Incident *</label>
                  <input
                    className="haven-input-sm"
                    type="datetime-local"
                    value={form.incidentDate}
                    onChange={e => set("incidentDate", e.target.value)}
                  />
                </div>
                <div className="form-row">
                  <label className="form-label">Location *</label>
                  <select className="haven-select" value={form.location} onChange={e => set("location", e.target.value)}>
                    <option value="">Select location...</option>
                    {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <label className="form-label">Type of Injury *</label>
                <div className="injury-type-grid">
                  {INJURY_TYPES.map(t => (
                    <button
                      key={t}
                      type="button"
                      className={`injury-type-btn ${form.injuryType === t ? "injury-type-btn-active" : ""}`}
                      onClick={() => set("injuryType", t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-row">
                <label className="form-label">Description of Incident *</label>
                <textarea
                  className="haven-input-sm haven-textarea"
                  rows={3}
                  placeholder="Describe what happened in detail — the more information you provide, the faster we can process your report."
                  value={form.description}
                  onChange={e => set("description", e.target.value)}
                />
              </div>

              {/* Medical Section */}
              <div className="form-section-label" style={{ marginTop: "1.25rem" }}>Medical Care</div>

              <div className="medical-toggle-row">
                <button
                  type="button"
                  className={`medical-toggle-btn ${form.medicalStatus === "received" ? "medical-toggle-active" : ""}`}
                  onClick={() => set("medicalStatus", "received")}
                >
                  <CheckCircle2 size={16} />
                  I have already received medical care
                </button>
                <button
                  type="button"
                  className={`medical-toggle-btn ${form.medicalStatus === "pending_care" ? "medical-toggle-active" : ""}`}
                  onClick={() => set("medicalStatus", "pending_care")}
                >
                  <Clock4 size={16} />
                  I am yet to receive medical care
                </button>
              </div>

              {form.medicalStatus === "received" && (
                <div className="form-row-2col">
                  <div className="form-row">
                    <label className="form-label">Medical Cost (USD)</label>
                    <div className="input-group">
                      <span className="input-icon" style={{ fontWeight: 600, fontSize: "0.9rem" }}>$</span>
                      <input
                        className="haven-input"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={form.medicalCost}
                        onChange={e => set("medicalCost", e.target.value)}
                      />
                    </div>
                    <p className="form-hint">Enter 0 if care was free / covered</p>
                  </div>
                  <div className="form-row">
                    <label className="form-label">Treatment Details *</label>
                    <input
                      className="haven-input-sm"
                      placeholder="e.g. Urgent Care on Pillbox Hill, stitches"
                      value={form.medicalNotes}
                      onChange={e => set("medicalNotes", e.target.value)}
                    />
                  </div>
                </div>
              )}

              {form.medicalStatus === "pending_care" && (
                <div className="form-row">
                  <label className="form-label">Additional Notes</label>
                  <input
                    className="haven-input-sm"
                    placeholder="Any symptoms or concerns you have..."
                    value={form.medicalNotes}
                    onChange={e => set("medicalNotes", e.target.value)}
                  />
                  <p className="form-hint">
                    Once you've received care, please update your report or file a new one with the cost so we can reimburse you.
                  </p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="haven-btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="haven-btn-danger" onClick={handleSubmit} disabled={saving}>
                <AlertTriangle size={15} />
                {saving ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function InjuryCard({ report }: { report: InjuryReport }) {
  const statusClass = {
    pending: "badge-pending",
    approved: "badge-approved",
    declined: "badge-declined",
  }[report.status];

  const medLabel = report.medicalStatus === "received"
    ? "Medical care received"
    : "Awaiting medical care";

  return (
    <div className="injury-card">
      <div className="injury-card-header">
        <div className="flex items-center gap-3">
          <div className="injury-icon-wrap">
            <AlertTriangle size={16} style={{ color: "var(--status-red)" }} />
          </div>
          <div>
            <p className="injury-card-title">{report.injuryType}</p>
            <p className="injury-card-meta">
              {report.location} &middot; {new Date(report.incidentDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>
        <span className={`status-badge ${statusClass}`}>{report.status}</span>
      </div>

      <p className="injury-card-desc">{report.description}</p>

      <div className="injury-card-footer">
        <div className="injury-meta-chips">
          <span className={`injury-chip ${report.medicalStatus === "received" ? "chip-green" : "chip-amber"}`}>
            <Stethoscope size={12} /> {medLabel}
          </span>
          {report.medicalCost !== null && (
            <span className="injury-chip chip-blue">
              <FileText size={12} /> Medical Cost: ${report.medicalCost.toFixed(2)}
            </span>
          )}
        </div>
        <p className="injury-submitted-at">
          Submitted {new Date(report.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </p>
      </div>

      {report.managerNote && (
        <div className="injury-manager-note">
          <strong>Manager Note:</strong> {report.managerNote}
        </div>
      )}
    </div>
  );
}

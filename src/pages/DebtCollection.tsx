import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDebtRecords, addDebtRecord, updateDebtRecord, deleteDebtRecord, claimDebt, type DebtRecord } from "@/lib/debtStore";
import { getEmployees, formatMoney } from "@/lib/store";
import { useAuth } from "@/context/AuthContext";
import AppShell from "@/components/AppShell";
import { toast } from "sonner";
import { DollarSign, TrendingUp, UserCheck, AlertTriangle, Plus, X, CheckCircle, User } from "lucide-react";

type FilterType = "all" | "open" | "claimed" | "paid" | "defaulted";

interface FormData {
  debtorName: string;
  initialAmount: string;
  interestRate: string;
  loanDate: string;
  dueDate: string;
  collectionNote: string;
}

const emptyForm = (): FormData => ({
  debtorName: "",
  initialAmount: "",
  interestRate: "",
  loanDate: "",
  dueDate: "",
  collectionNote: "",
});

export default function DebtCollection() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: debts = [] } = useQuery({ queryKey: ["debts"], queryFn: getDebtRecords });
  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: getEmployees });

  const [filter, setFilter] = useState<FilterType>("open");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDebt, setEditingDebt] = useState<DebtRecord | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!user || !form.debtorName || !form.initialAmount || !form.loanDate || !form.dueDate) {
      toast.error("Please fill all required fields.");
      return;
    }
    const initial = parseFloat(form.initialAmount);
    const rate = parseFloat(form.interestRate || "0");
    if (isNaN(initial) || initial <= 0) {
      toast.error("Initial amount must be a positive number.");
      return;
    }
    if (isNaN(rate) || rate < 0) {
      toast.error("Interest rate must be a non-negative number.");
      return;
    }
    const total = initial + (initial * rate / 100);
    await addDebtRecord({
      debtorName: form.debtorName,
      initialAmount: initial,
      interestRate: rate,
      totalOwed: total,
      loanDate: new Date(form.loanDate).toISOString(),
      dueDate: new Date(form.dueDate).toISOString(),
      status: "open",
      collectionNote: form.collectionNote,
      createdBy: user.id,
    });
    toast.success("Debt record created successfully.");
    qc.invalidateQueries({ queryKey: ["debts"] });
    setShowAddModal(false);
    setForm(emptyForm());
  };

  const handleEdit = async () => {
    if (!editingDebt || !form.debtorName || !form.initialAmount || !form.loanDate || !form.dueDate) {
      toast.error("Please fill all required fields.");
      return;
    }
    const initial = parseFloat(form.initialAmount);
    const rate = parseFloat(form.interestRate || "0");
    if (isNaN(initial) || initial <= 0) {
      toast.error("Initial amount must be a positive number.");
      return;
    }
    if (isNaN(rate) || rate < 0) {
      toast.error("Interest rate must be a non-negative number.");
      return;
    }
    const total = initial + (initial * rate / 100);
    await updateDebtRecord(editingDebt.id, {
      debtorName: form.debtorName,
      initialAmount: initial,
      interestRate: rate,
      totalOwed: total,
      loanDate: new Date(form.loanDate).toISOString(),
      dueDate: new Date(form.dueDate).toISOString(),
      collectionNote: form.collectionNote,
    });
    toast.success("Debt record updated successfully.");
    qc.invalidateQueries({ queryKey: ["debts"] });
    setShowEditModal(false);
    setEditingDebt(null);
    setForm(emptyForm());
  };

  const handleClaim = async (debtId: string) => {
    if (!user) return;
    await claimDebt(debtId, user.id);
    toast.success("Debt claimed successfully. Good luck collecting!");
    qc.invalidateQueries({ queryKey: ["debts"] });
  };

  const handleStatusChange = async (debtId: string, status: "paid" | "defaulted") => {
    await updateDebtRecord(debtId, { status });
    toast.success(`Debt marked as ${status}.`);
    qc.invalidateQueries({ queryKey: ["debts"] });
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await deleteDebtRecord(confirmDelete);
    toast.success("Debt record deleted.");
    qc.invalidateQueries({ queryKey: ["debts"] });
    setConfirmDelete(null);
  };

  const openEdit = (debt: DebtRecord) => {
    setEditingDebt(debt);
    setForm({
      debtorName: debt.debtorName,
      initialAmount: debt.initialAmount.toString(),
      interestRate: debt.interestRate.toString(),
      loanDate: debt.loanDate.split("T")[0],
      dueDate: debt.dueDate.split("T")[0],
      collectionNote: debt.collectionNote,
    });
    setShowEditModal(true);
  };

  const filtered = debts.filter(d => filter === "all" || d.status === filter);
  const totalOpen = debts.filter(d => d.status === "open").reduce((sum, d) => sum + d.totalOwed, 0);
  const totalClaimed = debts.filter(d => d.status === "claimed").reduce((sum, d) => sum + d.totalOwed, 0);
  const totalPaid = debts.filter(d => d.status === "paid").reduce((sum, d) => sum + d.totalOwed, 0);
  const totalDefaulted = debts.filter(d => d.status === "defaulted").reduce((sum, d) => sum + d.totalOwed, 0);

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();

  return (
    <AppShell>
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Debt Collection</h1>
            <p className="page-subtitle">Track loans, interest, and recovery status</p>
          </div>
          <button className="haven-btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> New Loan
          </button>
        </div>

        {/* Stats */}
        <div className="stats-grid mb-6">
          <div className="stat-card stat-card-amber">
            <div className="stat-icon"><AlertTriangle size={20} /></div>
            <div>
              <p className="stat-label">Open Debts</p>
              <p className="stat-value">{formatMoney(totalOpen)}</p>
              <p className="stat-sub">{debts.filter(d => d.status === "open").length} outstanding</p>
            </div>
          </div>
          <div className="stat-card stat-card-blue">
            <div className="stat-icon"><UserCheck size={20} /></div>
            <div>
              <p className="stat-label">Claimed</p>
              <p className="stat-value">{formatMoney(totalClaimed)}</p>
              <p className="stat-sub">{debts.filter(d => d.status === "claimed").length} in recovery</p>
            </div>
          </div>
          <div className="stat-card stat-card-green">
            <div className="stat-icon"><DollarSign size={20} /></div>
            <div>
              <p className="stat-label">Collected</p>
              <p className="stat-value">{formatMoney(totalPaid)}</p>
              <p className="stat-sub">{debts.filter(d => d.status === "paid").length} successful</p>
            </div>
          </div>
          <div className="stat-card stat-card-purple">
            <div className="stat-icon"><TrendingUp size={20} /></div>
            <div>
              <p className="stat-label">Defaulted</p>
              <p className="stat-value">{formatMoney(totalDefaulted)}</p>
              <p className="stat-sub">{debts.filter(d => d.status === "defaulted").length} uncollectable</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="filter-tabs mb-4">
          {(["open", "claimed", "paid", "defaulted", "all"] as FilterType[]).map(f => (
            <button
              key={f}
              className={`filter-tab ${filter === f ? "filter-tab-active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === "open" && debts.filter(d => d.status === "open").length > 0 && (
                <span className="filter-badge">{debts.filter(d => d.status === "open").length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Debts Grid */}
        <div className="debt-grid">
          {filtered.map(debt => {
            const collector = employees.find(e => e.id === debt.claimedBy);
            const creator = employees.find(e => e.id === debt.createdBy);
            const overdue = isOverdue(debt.dueDate) && debt.status !== "paid";
            return (
              <div key={debt.id} className={`debt-card ${overdue ? "debt-card-overdue" : ""}`}>
                <div className="debt-header">
                  <div className="debt-name">{debt.debtorName}</div>
                  <DebtStatusBadge status={debt.status} />
                </div>
                <div className="debt-body">
                  <div className="debt-row">
                    <span className="debt-label">Initial Loan</span>
                    <span className="debt-value">{formatMoney(debt.initialAmount)}</span>
                  </div>
                  <div className="debt-row">
                    <span className="debt-label">Interest Rate</span>
                    <span className="debt-value">{debt.interestRate}%</span>
                  </div>
                  <div className="debt-row debt-row-total">
                    <span className="debt-label">Total Owed</span>
                    <span className="debt-value-large">{formatMoney(debt.totalOwed)}</span>
                  </div>
                  <div className="debt-row">
                    <span className="debt-label">Loan Date</span>
                    <span className="debt-value">{new Date(debt.loanDate).toLocaleDateString()}</span>
                  </div>
                  <div className="debt-row">
                    <span className="debt-label">Due Date</span>
                    <span className="debt-value" style={{ color: overdue ? "var(--error)" : undefined }}>
                      {new Date(debt.dueDate).toLocaleDateString()}
                      {overdue && " (OVERDUE)"}
                    </span>
                  </div>
                  {collector && (
                    <div className="debt-row">
                      <span className="debt-label">Claimed By</span>
                      <span className="debt-value">{collector.name}</span>
                    </div>
                  )}
                  {debt.collectionNote && (
                    <div className="debt-note">{debt.collectionNote}</div>
                  )}
                  <div className="debt-meta">
                    Created by {creator?.name ?? "Unknown"} on {new Date(debt.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="debt-actions">
                  {debt.status === "open" && (
                    <button className="haven-btn-primary" onClick={() => handleClaim(debt.id)}>
                      <User size={14} /> Claim This Debt
                    </button>
                  )}
                  {debt.status === "claimed" && (
                    <>
                      <button className="action-btn action-btn-approve" onClick={() => handleStatusChange(debt.id, "paid")}>
                        <CheckCircle size={14} /> Mark Paid
                      </button>
                      <button className="action-btn action-btn-decline" onClick={() => handleStatusChange(debt.id, "defaulted")}>
                        <X size={14} /> Mark Defaulted
                      </button>
                    </>
                  )}
                  {(debt.status === "open" || debt.status === "claimed") && (
                    <>
                      <button className="action-btn" onClick={() => openEdit(debt)}>Edit</button>
                      <button className="action-btn action-btn-decline" onClick={() => setConfirmDelete(debt.id)}>Delete</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="empty-state">No debt records match this filter.</div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">New Loan</h2>
              <button className="icon-btn" onClick={() => setShowAddModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <label className="form-label">Debtor Name *</label>
                <input className="haven-input-sm" value={form.debtorName} onChange={e => setForm(f => ({ ...f, debtorName: e.target.value }))} placeholder="Full name" />
              </div>
              <div className="form-row-2col">
                <div className="form-row">
                  <label className="form-label">Initial Amount ($) *</label>
                  <input className="haven-input-sm" type="number" step="0.01" value={form.initialAmount} onChange={e => setForm(f => ({ ...f, initialAmount: e.target.value }))} placeholder="0.00" />
                </div>
                <div className="form-row">
                  <label className="form-label">Interest Rate (%) *</label>
                  <input className="haven-input-sm" type="number" step="0.01" value={form.interestRate} onChange={e => setForm(f => ({ ...f, interestRate: e.target.value }))} placeholder="0.00" />
                </div>
              </div>
              <div className="form-row-2col">
                <div className="form-row">
                  <label className="form-label">Loan Date *</label>
                  <input className="haven-input-sm" type="date" value={form.loanDate} onChange={e => setForm(f => ({ ...f, loanDate: e.target.value }))} />
                </div>
                <div className="form-row">
                  <label className="form-label">Due Date *</label>
                  <input className="haven-input-sm" type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <label className="form-label">Collection Note</label>
                <textarea className="haven-input-sm" rows={3} value={form.collectionNote} onChange={e => setForm(f => ({ ...f, collectionNote: e.target.value }))} placeholder="Any notes about this debt..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="haven-btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="haven-btn-primary" onClick={handleAdd}>Create Loan</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingDebt && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Edit Loan</h2>
              <button className="icon-btn" onClick={() => setShowEditModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <label className="form-label">Debtor Name *</label>
                <input className="haven-input-sm" value={form.debtorName} onChange={e => setForm(f => ({ ...f, debtorName: e.target.value }))} placeholder="Full name" />
              </div>
              <div className="form-row-2col">
                <div className="form-row">
                  <label className="form-label">Initial Amount ($) *</label>
                  <input className="haven-input-sm" type="number" step="0.01" value={form.initialAmount} onChange={e => setForm(f => ({ ...f, initialAmount: e.target.value }))} placeholder="0.00" />
                </div>
                <div className="form-row">
                  <label className="form-label">Interest Rate (%) *</label>
                  <input className="haven-input-sm" type="number" step="0.01" value={form.interestRate} onChange={e => setForm(f => ({ ...f, interestRate: e.target.value }))} placeholder="0.00" />
                </div>
              </div>
              <div className="form-row-2col">
                <div className="form-row">
                  <label className="form-label">Loan Date *</label>
                  <input className="haven-input-sm" type="date" value={form.loanDate} onChange={e => setForm(f => ({ ...f, loanDate: e.target.value }))} />
                </div>
                <div className="form-row">
                  <label className="form-label">Due Date *</label>
                  <input className="haven-input-sm" type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <label className="form-label">Collection Note</label>
                <textarea className="haven-input-sm" rows={3} value={form.collectionNote} onChange={e => setForm(f => ({ ...f, collectionNote: e.target.value }))} placeholder="Any notes about this debt..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="haven-btn-ghost" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="haven-btn-primary" onClick={handleEdit}>Update Loan</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal-box modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Delete Debt Record</h2>
              <button className="icon-btn" onClick={() => setConfirmDelete(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: "var(--cream-muted)", lineHeight: 1.6 }}>
                Are you sure you want to delete this debt record? This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button className="haven-btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="haven-btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function DebtStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: "badge-pending",
    claimed: "badge-info",
    paid: "badge-approved",
    defaulted: "badge-declined",
  };
  return <span className={`status-badge ${map[status] ?? ""}`}>{status}</span>;
}

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getJobTitles,
  addJobTitle,
  deleteJobTitle,
  type JobTitle,
} from "@/lib/jobTitlesStore";
import AppShell from "@/components/AppShell";
import { toast } from "sonner";
import { Plus, Trash2, Shield, Users, Briefcase, X } from "lucide-react";

export default function JobTitles() {
  const qc = useQueryClient();
  const { data: titles = [], isLoading } = useQuery({
    queryKey: ["job-titles"],
    queryFn: getJobTitles,
  });

  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<JobTitle | null>(null);

  const adminTitles = titles.filter((t) => t.isAdmin);
  const regularTitles = titles.filter((t) => !t.isAdmin);

  const openModal = () => {
    setNewName("");
    setNewIsAdmin(false);
    setShowModal(true);
  };

  const handleAdd = async () => {
    if (!newName.trim()) {
      toast.error("Please enter a job title name.");
      return;
    }
    setSaving(true);
    await addJobTitle(newName, newIsAdmin).catch((e) => {
      toast.error(e.message);
      setSaving(false);
      throw e;
    });
    toast.success(`"${newName.trim()}" added.`);
    qc.invalidateQueries({ queryKey: ["job-titles"] });
    setSaving(false);
    setShowModal(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await deleteJobTitle(confirmDelete.id);
    toast.success(`"${confirmDelete.name}" removed.`);
    qc.invalidateQueries({ queryKey: ["job-titles"] });
    setConfirmDelete(null);
  };

  return (
    <AppShell>
      <div className="page-container">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Job Titles</h1>
            <p className="page-subtitle">
              Create and manage staff positions across the venue
            </p>
          </div>
          <button className="haven-btn-primary" onClick={openModal}>
            <Plus size={16} /> New Job Title
          </button>
        </div>

        {/* Stats row */}
        <div className="jt-stats-row">
          <div className="jt-stat">
            <div className="jt-stat-icon jt-stat-icon-gold">
              <Briefcase size={18} />
            </div>
            <div>
              <p className="jt-stat-label">Total Positions</p>
              <p className="jt-stat-val">{titles.length}</p>
            </div>
          </div>
          <div className="jt-stat">
            <div className="jt-stat-icon jt-stat-icon-purple">
              <Shield size={18} />
            </div>
            <div>
              <p className="jt-stat-label">Admin Roles</p>
              <p className="jt-stat-val">{adminTitles.length}</p>
            </div>
          </div>
          <div className="jt-stat">
            <div className="jt-stat-icon jt-stat-icon-blue">
              <Users size={18} />
            </div>
            <div>
              <p className="jt-stat-label">Regular Roles</p>
              <p className="jt-stat-val">{regularTitles.length}</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="loading-state">Loading job titles...</div>
        ) : (
          <div className="jt-columns">
            {/* Admin Roles Column */}
            <div className="jt-column">
              <div className="jt-column-header jt-column-header-admin">
                <Shield size={15} />
                <span>Admin Roles</span>
                <span className="jt-column-count">{adminTitles.length}</span>
              </div>
              <p className="jt-column-desc">
                These roles have access to management features — shift approval,
                employee management, and injury reports.
              </p>
              <div className="jt-list">
                {adminTitles.map((t) => (
                  <TitleRow
                    key={t.id}
                    title={t}
                    isAdmin
                    onDelete={() => setConfirmDelete(t)}
                  />
                ))}
                {adminTitles.length === 0 && (
                  <p className="jt-empty">No admin roles defined.</p>
                )}
              </div>
            </div>

            {/* Regular Roles Column */}
            <div className="jt-column">
              <div className="jt-column-header jt-column-header-regular">
                <Users size={15} />
                <span>Regular Roles</span>
                <span className="jt-column-count">{regularTitles.length}</span>
              </div>
              <p className="jt-column-desc">
                Standard staff positions — can clock in/out and view their own
                shifts and reports.
              </p>
              <div className="jt-list">
                {regularTitles.map((t) => (
                  <TitleRow
                    key={t.id}
                    title={t}
                    isAdmin={false}
                    onDelete={() => setConfirmDelete(t)}
                  />
                ))}
                {regularTitles.length === 0 && (
                  <p className="jt-empty">No regular roles defined.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="modal-box modal-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">New Job Title</h2>
              <button className="icon-btn" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <label className="form-label">Title Name *</label>
                <input
                  className="haven-input-sm"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Floor Host, DJ, Supervisor..."
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  autoFocus
                />
              </div>
              <div className="form-row">
                <label className="form-label">Access Level</label>
                <div className="jt-access-toggle">
                  <button
                    type="button"
                    className={`jt-access-btn ${!newIsAdmin ? "jt-access-btn-active" : ""}`}
                    onClick={() => setNewIsAdmin(false)}
                  >
                    <Users size={14} />
                    Regular Staff
                  </button>
                  <button
                    type="button"
                    className={`jt-access-btn ${newIsAdmin ? "jt-access-btn-active jt-access-btn-admin" : ""}`}
                    onClick={() => setNewIsAdmin(true)}
                  >
                    <Shield size={14} />
                    Admin Access
                  </button>
                </div>
                <p className="jt-access-hint">
                  {newIsAdmin
                    ? "Admin roles can manage shifts, employees, and injury reports."
                    : "Regular roles can clock in/out and view their own data."}
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="haven-btn-ghost"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                className="haven-btn-primary"
                onClick={handleAdd}
                disabled={saving}
              >
                {saving ? "Adding..." : "Add Title"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div
            className="modal-box modal-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="modal-title">Remove Job Title</h2>
            <p className="modal-text">
              Are you sure you want to remove{" "}
              <strong>"{confirmDelete.name}"</strong>? Employees with this role
              will keep it until manually updated.
            </p>
            <div className="modal-footer mt-4">
              <button
                className="haven-btn-ghost"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>
              <button className="haven-btn-danger" onClick={handleDelete}>
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function TitleRow({
  title,
  isAdmin,
  onDelete,
}: {
  title: JobTitle;
  isAdmin: boolean;
  onDelete: () => void;
}) {
  return (
    <div className={`jt-row ${isAdmin ? "jt-row-admin" : ""}`}>
      <div className="jt-row-left">
        <div className={`jt-dot ${isAdmin ? "jt-dot-admin" : "jt-dot-regular"}`} />
        <span className="jt-row-name">{title.name}</span>
        {isAdmin && <span className="jt-admin-badge">Admin</span>}
      </div>
      <div className="jt-row-right">
        <span className="jt-row-date">
          {new Date(title.createdAt).toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          })}
        </span>
        <button
          className="icon-btn icon-btn-danger"
          title="Remove"
          onClick={onDelete}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

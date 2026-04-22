import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getBannedIndividuals, addBannedIndividual, updateBannedIndividual, deleteBannedIndividual } from "@/lib/bannedIndividualsStore";
import { getEmployees } from "@/lib/store";
import { useAuth } from "@/context/AuthContext";
import AppShell from "@/components/AppShell";
import { toast } from "sonner";
import { Ban, Plus, X, Shield, UserX, Camera } from "lucide-react";

interface FormData {
  individualName: string;
  photoUrl: string | null;
  banReason: string;
  notes: string;
}

const emptyForm = (): FormData => ({
  individualName: "",
  photoUrl: null,
  banReason: "",
  notes: "",
});

export default function BannedIndividuals() {
  const { user, isOwnerOrManager } = useAuth();
  const qc = useQueryClient();
  const { data: bannedIndividuals = [] } = useQuery({ queryKey: ["banned-individuals"], queryFn: getBannedIndividuals });
  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: getEmployees });

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<any>(null);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm(f => ({ ...f, photoUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setForm(f => ({ ...f, photoUrl: null }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAdd = async () => {
    if (!user || !form.individualName || !form.banReason) {
      toast.error("Please fill all required fields.");
      return;
    }
    try {
      console.log('[BannedIndividuals] Adding individual with form data:', form);
      await addBannedIndividual({
        individualName: form.individualName,
        photoUrl: form.photoUrl,
        banReason: form.banReason,
        notes: form.notes,
        bannedBy: user.id,
      });
      toast.success("Individual added to ban list.");
      qc.invalidateQueries({ queryKey: ["banned-individuals"] });
      setShowAddModal(false);
      setForm(emptyForm());
    } catch (error: any) {
      console.error('[BannedIndividuals] Error adding individual:', error);
      toast.error(error.message || "Failed to add individual to ban list.");
    }
  };

  const handleEdit = async () => {
    if (!editingPlayer || !form.individualName || !form.banReason) {
      toast.error("Please fill all required fields.");
      return;
    }
    try {
      const { individualName, photoUrl, banReason, notes } = form;
      await updateBannedIndividual(editingPlayer, { individualName: individualName, photoUrl, banReason, notes });
      qc.invalidateQueries({ queryKey: ["banned-individuals"] });
      toast.success("Banned individual updated successfully.");
      setShowEditModal(false);
      setEditingPlayer(null);
      setForm(emptyForm());
    } catch (error: any) {
      console.error('[BannedIndividuals] Error updating individual:', error);
      toast.error(error.message || "Failed to update individual.");
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteBannedIndividual(confirmDelete);
      setConfirmDelete(null);
      qc.invalidateQueries({ queryKey: ["banned-individuals"] });
      toast.success("Entry removed from ban list.");
    } catch (error: any) {
      console.error("Error deleting banned individual:", error);
      toast.error(error.message || "Failed to remove individual from ban list.");
    }
  };

  const openEdit = (individual: any) => {
    setEditingPlayer(individual.id);
    setForm({ individualName: individual.individualName, photoUrl: individual.photoUrl, banReason: individual.banReason, notes: individual.notes });
    setShowEditModal(true);
  };

  return (
    <AppShell>
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Banned Individuals</h1>
            <p className="page-subtitle">Track and manage individuals banned from the establishment</p>
          </div>
          {isOwnerOrManager && (
            <button className="haven-btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus size={16} /> Add to List
            </button>
          )}
        </div>

        {/* Warning Banner */}
        <div className="banned-alert">
          <Shield size={20} />
          <div>
            <p className="banned-alert-title">Security Notice</p>
            <p className="banned-alert-text">
              These individuals are permanently banned from the establishment. Do not serve under any circumstances. Contact management immediately if they attempt entry.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mini-stats-row mb-6">
          <div className="mini-stat">
            <UserX size={16} className="mini-stat-icon red" />
            <div>
              <p className="mini-stat-label">Total Banned</p>
              <p className="mini-stat-val">{bannedIndividuals.length} individuals</p>
            </div>
          </div>
          <div className="mini-stat">
            <Ban size={16} className="mini-stat-icon amber" />
            <div>
              <p className="mini-stat-label">Active Bans</p>
              <p className="mini-stat-val">{bannedIndividuals.length} enforced</p>
            </div>
          </div>
        </div>

        {/* Banned Players Grid */}
        <div className="banned-grid">
          {bannedIndividuals.map(individual => {
            const emp = employees.find(e => e.id === individual.bannedBy);
            return (
              <div key={individual.id} className="banned-card">
                <div className="banned-photo-wrap">
                  {individual.photoUrl ? (
                    <img src={individual.photoUrl} alt={individual.individualName} className="banned-photo" />
                  ) : (
                    <div className="banned-photo-placeholder">
                      <UserX size={40} />
                    </div>
                  )}
                  <div className="banned-badge">BANNED</div>
                </div>
                <div className="banned-info">
                  <h3 className="banned-name">{individual.individualName}</h3>
                  <div className="banned-reason">
                    <span className="banned-reason-label">Reason:</span>
                    <span className="banned-reason-text">{individual.banReason}</span>
                  </div>
                  {individual.notes && (
                    <div className="banned-notes">{individual.notes}</div>
                  )}
                  <div className="banned-meta">
                    Banned by {emp?.name ?? "Unknown"} on {new Date(individual.bannedAt).toLocaleDateString()}
                  </div>
                  {isOwnerOrManager && (
                    <div className="banned-actions">
                      <button className="action-btn" onClick={() => openEdit(individual)}>Edit</button>
                      <button className="action-btn action-btn-decline" onClick={() => setConfirmDelete(individual.id)}>Remove</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {bannedIndividuals.length === 0 && (
            <div className="empty-state">No banned individuals on record.</div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Individual to Ban List</h2>
              <button className="icon-btn" onClick={() => setShowAddModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <label className="form-label">Photo (optional)</label>
                <div className="photo-upload-area">
                  {form.photoUrl ? (
                    <div className="photo-preview-container">
                      <img src={form.photoUrl} alt="Preview" className="photo-preview" />
                      <button className="photo-remove-btn" onClick={removeImage}><X size={16} /></button>
                    </div>
                  ) : (
                    <label className="photo-upload-label">
                      <Camera size={24} />
                      <span>Click to upload photo</span>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
                    </label>
                  )}
                </div>
              </div>
              <div className="form-row">
                <label className="form-label">Individual Name *</label>
                <input className="haven-input-sm" value={form.individualName} onChange={e => setForm(f => ({ ...f, individualName: e.target.value }))} placeholder="e.g. John Smith" />
              </div>
              <div className="form-row">
                <label className="form-label">Ban Reason *</label>
                <input className="haven-input-sm" value={form.banReason} onChange={e => setForm(f => ({ ...f, banReason: e.target.value }))} placeholder="e.g. Violence, Fraud, etc." />
              </div>
              <div className="form-row">
                <label className="form-label">Additional Notes</label>
                <textarea className="haven-input-sm" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional information..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="haven-btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="haven-btn-primary" onClick={handleAdd}>Add to List</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingPlayer && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Edit Banned Individual</h2>
              <button className="icon-btn" onClick={() => setShowEditModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <label className="form-label">Photo (optional)</label>
                <div className="photo-upload-area">
                  {form.photoUrl ? (
                    <div className="photo-preview-container">
                      <img src={form.photoUrl} alt="Preview" className="photo-preview" />
                      <button className="photo-remove-btn" onClick={removeImage}><X size={16} /></button>
                    </div>
                  ) : (
                    <label className="photo-upload-label">
                      <Camera size={24} />
                      <span>Click to upload photo</span>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
                    </label>
                  )}
                </div>
              </div>
              <div className="form-row">
                <label className="form-label">Individual Name *</label>
                <input className="haven-input-sm" value={form.individualName} onChange={e => setForm(f => ({ ...f, individualName: e.target.value }))} placeholder="e.g. John Smith" />
              </div>
              <div className="form-row">
                <label className="form-label">Ban Reason *</label>
                <input className="haven-input-sm" value={form.banReason} onChange={e => setForm(f => ({ ...f, banReason: e.target.value }))} placeholder="e.g. Violence, Fraud, etc." />
              </div>
              <div className="form-row">
                <label className="form-label">Additional Notes</label>
                <textarea className="haven-input-sm" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional information..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="haven-btn-ghost" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="haven-btn-primary" onClick={handleEdit}>Update</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal-box modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Remove from Ban List</h2>
              <button className="icon-btn" onClick={() => setConfirmDelete(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: "var(--cream-muted)", fontSize: "0.9rem", marginBottom: "1rem" }}>Are you sure you want to remove this individual from the ban list? This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="haven-btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="haven-btn-danger" onClick={handleDelete}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
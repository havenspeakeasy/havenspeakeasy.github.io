import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getBannedPlayers, addBannedPlayer, updateBannedPlayer, deleteBannedPlayer, type BannedPlayer } from "@/lib/bannedPlayersStore";
import { getEmployees } from "@/lib/store";
import { useAuth } from "@/context/AuthContext";
import AppShell from "@/components/AppShell";
import { toast } from "sonner";
import { Ban, Plus, X, Shield, UserX, Camera } from "lucide-react";

interface FormData {
  playerName: string;
  photoUrl: string | null;
  banReason: string;
  notes: string;
}

const emptyForm = (): FormData => ({
  playerName: "",
  photoUrl: null,
  banReason: "",
  notes: "",
});

export default function BannedPlayers() {
  const { user, isOwnerOrManager } = useAuth();
  const qc = useQueryClient();
  const { data: banned = [] } = useQuery({ queryKey: ["banned-players"], queryFn: getBannedPlayers });
  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: getEmployees });

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<BannedPlayer | null>(null);
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
    if (!user || !form.playerName || !form.banReason) {
      toast.error("Please fill all required fields.");
      return;
    }
    await addBannedPlayer({
      playerName: form.playerName,
      photoUrl: form.photoUrl,
      banReason: form.banReason,
      notes: form.notes,
      bannedBy: user.id,
    });
    toast.success("Player added to banned list.");
    qc.invalidateQueries({ queryKey: ["banned-players"] });
    setShowAddModal(false);
    setForm(emptyForm());
  };

  const handleEdit = async () => {
    if (!editingPlayer || !form.playerName || !form.banReason) {
      toast.error("Please fill all required fields.");
      return;
    }
    await updateBannedPlayer(editingPlayer.id, {
      playerName: form.playerName,
      photoUrl: form.photoUrl,
      banReason: form.banReason,
      notes: form.notes,
    });
    toast.success("Banned player updated successfully.");
    qc.invalidateQueries({ queryKey: ["banned-players"] });
    setShowEditModal(false);
    setEditingPlayer(null);
    setForm(emptyForm());
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await deleteBannedPlayer(confirmDelete);
    toast.success("Player removed from banned list.");
    qc.invalidateQueries({ queryKey: ["banned-players"] });
    setConfirmDelete(null);
  };

  const openEdit = (player: BannedPlayer) => {
    setEditingPlayer(player);
    setForm({
      playerName: player.playerName,
      photoUrl: player.photoUrl,
      banReason: player.banReason,
      notes: player.notes,
    });
    setShowEditModal(true);
  };

  return (
    <AppShell>
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Banned Players</h1>
            <p className="page-subtitle">Barred individuals — do not serve</p>
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
              <p className="mini-stat-val">{banned.length} individuals</p>
            </div>
          </div>
          <div className="mini-stat">
            <Ban size={16} className="mini-stat-icon amber" />
            <div>
              <p className="mini-stat-label">Active Bans</p>
              <p className="mini-stat-val">{banned.length} enforced</p>
            </div>
          </div>
        </div>

        {/* Banned Players Grid */}
        <div className="banned-grid">
          {banned.map(player => {
            const banner = employees.find(e => e.id === player.bannedBy);
            return (
              <div key={player.id} className="banned-card">
                <div className="banned-photo-wrap">
                  {player.photoUrl ? (
                    <img src={player.photoUrl} alt={player.playerName} className="banned-photo" />
                  ) : (
                    <div className="banned-photo-placeholder">
                      <UserX size={40} />
                    </div>
                  )}
                  <div className="banned-badge">BANNED</div>
                </div>
                <div className="banned-info">
                  <h3 className="banned-name">{player.playerName}</h3>
                  <div className="banned-reason">
                    <span className="banned-reason-label">Reason:</span>
                    <span className="banned-reason-text">{player.banReason}</span>
                  </div>
                  {player.notes && (
                    <div className="banned-notes">{player.notes}</div>
                  )}
                  <div className="banned-meta">
                    Banned by {banner?.name ?? "Unknown"} on {new Date(player.bannedAt).toLocaleDateString()}
                  </div>
                  {isOwnerOrManager && (
                    <div className="banned-actions">
                      <button className="action-btn" onClick={() => openEdit(player)}>Edit</button>
                      <button className="action-btn action-btn-decline" onClick={() => setConfirmDelete(player.id)}>Remove</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {banned.length === 0 && (
            <div className="empty-state">No banned players on record.</div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Banned Player</h2>
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
                <label className="form-label">Player Name *</label>
                <input className="haven-input-sm" value={form.playerName} onChange={e => setForm(f => ({ ...f, playerName: e.target.value }))} placeholder="Full name" />
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
              <h2 className="modal-title">Edit Banned Player</h2>
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
                <label className="form-label">Player Name *</label>
                <input className="haven-input-sm" value={form.playerName} onChange={e => setForm(f => ({ ...f, playerName: e.target.value }))} placeholder="Full name" />
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
              <p style={{ color: "var(--cream-muted)", lineHeight: 1.6 }}>
                Are you sure you want to remove this person from the banned list? They will be allowed to enter the establishment again.
              </p>
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

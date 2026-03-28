import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getEmployees, addEmployee, updateEmployee, deleteEmployee, type Employee, type Role } from "@/lib/store";
import { getJobTitles, getAdminRoleNames } from "@/lib/jobTitlesStore";
import AppShell from "@/components/AppShell";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Shield, Eye, EyeOff, X, Camera, Upload } from "lucide-react";

type FormData = {
  name: string;
  username: string;
  password: string;
  role: Role;
  hourlyRate: string;
  isActive: boolean;
  joinedAt: string;
  avatarUrl: string;
};

const emptyForm = (): FormData => ({
  name: "",
  username: "",
  password: "",
  role: "",
  hourlyRate: "75",
  isActive: true,
  joinedAt: new Date().toISOString().split("T")[0],
  avatarUrl: "",
});

export default function Employees() {
  const qc = useQueryClient();
  const { data: employees = [], isLoading } = useQuery({ queryKey: ["employees"], queryFn: getEmployees });
  const { data: jobTitles = [] } = useQuery({ queryKey: ["job-titles"], queryFn: getJobTitles });
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [showPw, setShowPw] = useState(false);
  const [deleting, setDeleting] = useState<Employee | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const adminRoleNames = getAdminRoleNames();
  const adminTitles = jobTitles.filter((t) => t.isAdmin);
  const regularTitles = jobTitles.filter((t) => !t.isAdmin);

  const openAdd = () => {
    const firstRole = jobTitles.find((t) => !t.isAdmin)?.name ?? (jobTitles[0]?.name ?? "");
    setForm({ ...emptyForm(), role: firstRole });
    setImagePreview("");
    setModal("add");
  };

  const openEdit = (emp: Employee) => {
    setEditing(emp);
    setForm({
      name: emp.name,
      username: emp.username,
      password: emp.password,
      role: emp.role,
      hourlyRate: emp.hourlyRate.toString(),
      isActive: emp.isActive,
      joinedAt: emp.joinedAt,
      avatarUrl: emp.avatarUrl ?? "",
    });
    setImagePreview(emp.avatarUrl ?? "");
    setModal("edit");
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setImagePreview(result);
      setForm(f => ({ ...f, avatarUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview("");
    setForm(f => ({ ...f, avatarUrl: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!form.name || !form.username || !form.password) {
      toast.error("Please fill all required fields.");
      return;
    }
    if (modal === "add") {
      await addEmployee({
        name: form.name,
        username: form.username,
        password: form.password,
        role: form.role,
        hourlyRate: parseFloat(form.hourlyRate) || 0,
        isActive: form.isActive,
        joinedAt: form.joinedAt,
        avatarUrl: form.avatarUrl || undefined,
      }).catch(e => { toast.error(e.message); throw e; });
      toast.success(`${form.name} has been added.`);
    } else if (editing) {
      await updateEmployee(editing.id, {
        name: form.name,
        username: form.username,
        password: form.password,
        role: form.role,
        hourlyRate: parseFloat(form.hourlyRate) || 0,
        isActive: form.isActive,
        joinedAt: form.joinedAt,
        avatarUrl: form.avatarUrl || undefined,
      });
      toast.success(`${form.name} updated.`);
    }
    qc.invalidateQueries({ queryKey: ["employees"] });
    setModal(null);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    await deleteEmployee(deleting.id);
    toast.success(`${deleting.name} removed.`);
    qc.invalidateQueries({ queryKey: ["employees"] });
    setDeleting(null);
  };

  const isAdminRole = (role: string) => adminRoleNames.includes(role);

  return (
    <AppShell>
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Employees</h1>
            <p className="page-subtitle">Manage staff accounts and credentials</p>
          </div>
          <button className="haven-btn-primary" onClick={openAdd}><Plus size={16} /> Add Employee</button>
        </div>

        {isLoading ? <div className="loading-state">Loading...</div> : (
          <div className="emp-grid">
            {employees.map(emp => (
              <div key={emp.id} className={`emp-card ${!emp.isActive ? "emp-card-inactive" : ""}`}>
                <div className="emp-card-top">
                  {/* Avatar */}
                  {emp.avatarUrl ? (
                    <div className="emp-avatar-photo">
                      <img src={emp.avatarUrl} alt={emp.name} className="emp-avatar-img" />
                    </div>
                  ) : (
                    <div className="avatar-lg">{emp.avatarInitials}</div>
                  )}
                  <div className="emp-card-info">
                    <p className="emp-name">{emp.name}</p>
                    <p className="emp-role">{emp.role}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`status-pill ${emp.isActive ? "status-pill-active" : "status-pill-inactive"}`}>
                        {emp.isActive ? "Active" : "Inactive"}
                      </span>
                      {isAdminRole(emp.role) && (
                        <span className="role-badge-admin">Admin</span>
                      )}
                    </div>
                  </div>
                  <div className="emp-actions">
                    <button className="icon-btn" title="Edit" onClick={() => openEdit(emp)}><Pencil size={15} /></button>
                    <button className="icon-btn icon-btn-danger" title="Remove" onClick={() => setDeleting(emp)}><Trash2 size={15} /></button>
                  </div>
                </div>
                <div className="emp-card-details">
                  <div className="emp-detail"><Shield size={13} /><span>{emp.username}</span></div>
                  <div className="emp-detail-row">
                    <span className="emp-detail-label">Hourly Rate</span>
                    <span className="emp-detail-val">${emp.hourlyRate}/hr</span>
                  </div>
                  <div className="emp-detail-row">
                    <span className="emp-detail-label">Joined</span>
                    <span className="emp-detail-val">{new Date(emp.joinedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{modal === "add" ? "Add New Employee" : "Edit Employee"}</h2>
              <button className="icon-btn" onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">

              {/* Photo Upload */}
              <div className="form-row">
                <label className="form-label">Profile Photo</label>
                <div className="photo-upload-area">
                  {imagePreview ? (
                    <div className="photo-preview-wrap">
                      <img src={imagePreview} alt="Preview" className="photo-preview-img" />
                      <button type="button" className="photo-remove-btn" onClick={removeImage} title="Remove photo">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="photo-upload-btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera size={22} style={{ color: "var(--gold)" }} />
                      <span className="photo-upload-label">Upload Photo</span>
                      <span className="photo-upload-sub">JPG, PNG up to 5MB</span>
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleImageChange}
                  />
                  {imagePreview && (
                    <button
                      type="button"
                      className="photo-change-btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload size={13} /> Change Photo
                    </button>
                  )}
                </div>
              </div>

              <div className="form-row">
                <label className="form-label">Full Name *</label>
                <input className="haven-input-sm" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. John Doe" />
              </div>
              <div className="form-row">
                <label className="form-label">Username *</label>
                <input className="haven-input-sm" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="e.g. john.doe" />
              </div>
              <div className="form-row">
                <label className="form-label">Password *</label>
                <div className="input-group">
                  <input className="haven-input-sm" type={showPw ? "text" : "password"} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Set a password" />
                  <button type="button" className="input-icon-btn" onClick={() => setShowPw(v => !v)}>{showPw ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                </div>
              </div>

              {/* Role grouped */}
              <div className="form-row">
                <label className="form-label">Role</label>
                <div className="role-select-group">
                  {adminTitles.length > 0 && (
                    <>
                      <div className="role-group-label">Admin Roles</div>
                      <div className="role-options">
                        {adminTitles.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            className={`role-option ${form.role === t.name ? "role-option-selected role-option-admin" : ""}`}
                            onClick={() => setForm((f) => ({ ...f, role: t.name }))}
                          >
                            {t.name}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {regularTitles.length > 0 && (
                    <>
                      <div className="role-group-label mt-2">Regular Roles</div>
                      <div className="role-options">
                        {regularTitles.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            className={`role-option ${form.role === t.name ? "role-option-selected" : ""}`}
                            onClick={() => setForm((f) => ({ ...f, role: t.name }))}
                          >
                            {t.name}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {jobTitles.length === 0 && (
                    <p className="jt-empty" style={{ marginTop: "0.5rem" }}>No job titles defined yet. Add them in Job Titles settings.</p>
                  )}
                </div>
              </div>

              <div className="form-row-2col">
                <div className="form-row">
                  <label className="form-label">Hourly Rate ($)</label>
                  <input className="haven-input-sm" type="number" value={form.hourlyRate} onChange={e => setForm(f => ({ ...f, hourlyRate: e.target.value }))} min="0" />
                </div>
                <div className="form-row">
                  <label className="form-label">Join Date</label>
                  <input className="haven-input-sm" type="date" value={form.joinedAt} onChange={e => setForm(f => ({ ...f, joinedAt: e.target.value }))} />
                </div>
              </div>

              <div className="form-row">
                <label className="form-label">Status</label>
                <select className="haven-select" value={form.isActive ? "active" : "inactive"} onChange={e => setForm(f => ({ ...f, isActive: e.target.value === "active" }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="haven-btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="haven-btn-primary" onClick={handleSave}>{modal === "add" ? "Add Employee" : "Save Changes"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleting && (
        <div className="modal-overlay" onClick={() => setDeleting(null)}>
          <div className="modal-box modal-sm" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Remove Employee</h2>
            <p className="modal-text">Are you sure you want to remove <strong>{deleting.name}</strong>? This cannot be undone.</p>
            <div className="modal-footer mt-4">
              <button className="haven-btn-ghost" onClick={() => setDeleting(null)}>Cancel</button>
              <button className="haven-btn-danger" onClick={handleDelete}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

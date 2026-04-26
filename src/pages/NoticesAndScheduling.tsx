import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getNotices, addNotice, updateNotice, deleteNotice, type Notice, type NoticePriority } from "@/lib/noticesStore";
import { getSchedules, addSchedule, updateSchedule, deleteSchedule, type Schedule } from "@/lib/schedulesStore";
import { getEmployees } from "@/lib/store";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Bell, Calendar, Plus, X, Pencil, Trash2, Clock, AlertCircle } from "lucide-react";
import AppShell from "@/components/AppShell";

type NoticeFormData = {
  title: string;
  content: string;
  priority: NoticePriority;
};

type ScheduleFormData = {
  date: string;
  openingTime: string;
  closingTime: string;
  notes: string;
};

function emptyNoticeForm(): NoticeFormData {
  return { title: "", content: "", priority: "normal" };
}

function emptyScheduleForm(): ScheduleFormData {
  return { date: "", openingTime: "", closingTime: "", notes: "" };
}

export default function NoticesAndScheduling() {
  const { user, isOwnerOrManager } = useAuth();
  const qc = useQueryClient();

  const { data: notices = [] } = useQuery({ queryKey: ["notices"], queryFn: getNotices });
  const { data: schedules = [] } = useQuery({ queryKey: ["schedules"], queryFn: getSchedules });
  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: getEmployees });

  const [noticeModal, setNoticeModal] = useState<"add" | "edit" | null>(null);
  const [noticeForm, setNoticeForm] = useState<NoticeFormData>(emptyNoticeForm());
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [deleteNoticeModal, setDeleteNoticeModal] = useState<Notice | null>(null);

  const [scheduleModal, setScheduleModal] = useState<"add" | "edit" | null>(null);
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormData>(emptyScheduleForm());
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [deleteScheduleModal, setDeleteScheduleModal] = useState<Schedule | null>(null);

  // ─── Notice Handlers ───────────────────────────────────────────────────────
  const openAddNotice = () => {
    setNoticeForm(emptyNoticeForm());
    setEditingNotice(null);
    setNoticeModal("add");
  };

  const openEditNotice = (notice: Notice) => {
    setNoticeForm({ title: notice.title, content: notice.content, priority: notice.priority });
    setEditingNotice(notice);
    setNoticeModal("edit");
  };

  const handleSaveNotice = async () => {
    if (!user || !noticeForm.title.trim() || !noticeForm.content.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (noticeModal === "add") {
      await addNotice({ ...noticeForm, createdBy: user.id });
      toast.success("Notice posted successfully!");
    } else if (noticeModal === "edit" && editingNotice) {
      await updateNotice(editingNotice.id, noticeForm);
      toast.success("Notice updated!");
    }
    qc.invalidateQueries({ queryKey: ["notices"] });
    setNoticeModal(null);
  };

  const handleDeleteNotice = async () => {
    if (!deleteNoticeModal) return;
    await deleteNotice(deleteNoticeModal.id);
    toast.success("Notice deleted.");
    qc.invalidateQueries({ queryKey: ["notices"] });
    setDeleteNoticeModal(null);
  };

  // ─── Schedule Handlers ─────────────────────────────────────────────────────
  const openAddSchedule = () => {
    setScheduleForm(emptyScheduleForm());
    setEditingSchedule(null);
    setScheduleModal("add");
  };

  const openEditSchedule = (schedule: Schedule) => {
    setScheduleForm({
      date: schedule.date,
      openingTime: schedule.openingTime,
      closingTime: schedule.closingTime,
      notes: schedule.notes,
    });
    setEditingSchedule(schedule);
    setScheduleModal("edit");
  };

  const handleSaveSchedule = async () => {
    if (!user || !scheduleForm.date || !scheduleForm.openingTime || !scheduleForm.closingTime) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (scheduleModal === "add") {
      await addSchedule({ ...scheduleForm, createdBy: user.id });
      toast.success("Schedule entry added!");
    } else if (scheduleModal === "edit" && editingSchedule) {
      await updateSchedule(editingSchedule.id, scheduleForm);
      toast.success("Schedule updated!");
    }
    qc.invalidateQueries({ queryKey: ["schedules"] });
    setScheduleModal(null);
  };

  const handleDeleteSchedule = async () => {
    if (!deleteScheduleModal) return;
    await deleteSchedule(deleteScheduleModal.id);
    toast.success("Schedule deleted.");
    qc.invalidateQueries({ queryKey: ["schedules"] });
    setDeleteScheduleModal(null);
  };

  const getEmployee = (id: string) => employees.find((e) => e.id === id);

  return (
    <AppShell>
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Notices & Scheduling</h1>
            <p className="page-subtitle">View announcements and upcoming operating hours</p>
          </div>
        </div>

        {/* Notice Board Section */}
        <div className="section-title mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell size={18} style={{ color: "var(--gold)" }} />
            <span>Notice Board</span>
          </div>
          {isOwnerOrManager && (
            <button className="haven-btn-primary" onClick={openAddNotice}>
              <Plus size={16} /> Post Notice
            </button>
          )}
        </div>

        {notices.length === 0 ? (
          <div className="empty-state" style={{ padding: "2rem", textAlign: "center", color: "var(--cream-muted)" }}>
            No notices posted yet.
          </div>
        ) : (
          <div className="notices-grid">
            {notices.map((notice) => {
              const author = getEmployee(notice.createdBy);
              return (
                <div key={notice.id} className={`notice-card notice-card-${notice.priority}`}>
                  <div className="notice-header">
                    <div className="notice-priority-badge">
                      {notice.priority === "urgent" && <AlertCircle size={14} />}
                      {notice.priority.toUpperCase()}
                    </div>
                    {isOwnerOrManager && (
                      <div className="notice-actions">
                        <button className="icon-btn" onClick={() => openEditNotice(notice)} title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button className="icon-btn" onClick={() => setDeleteNoticeModal(notice)} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                  <h3 className="notice-title">{notice.title}</h3>
                  <p className="notice-content">{notice.content}</p>
                  <div className="notice-footer">
                    <span className="notice-meta">
                      Posted by {author?.name ?? "Unknown"} · {new Date(notice.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Schedule Section */}
        <div className="section-title mb-4 mt-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={18} style={{ color: "var(--gold)" }} />
            <span>Operating Schedule</span>
          </div>
          {isOwnerOrManager && (
            <button className="haven-btn-primary" onClick={openAddSchedule}>
              <Plus size={16} /> Add Schedule
            </button>
          )}
        </div>

        {schedules.length === 0 ? (
          <div className="empty-state" style={{ padding: "2rem", textAlign: "center", color: "var(--cream-muted)" }}>
            No schedules posted yet.
          </div>
        ) : (
          <div className="schedule-grid">
            {schedules.map((schedule) => (
              <div key={schedule.id} className="schedule-card">
                <div className="schedule-date">
                  {new Date(schedule.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </div>
                <div className="schedule-times">
                  <Clock size={16} style={{ color: "var(--gold)" }} />
                  <span>
                    {schedule.openingTime} – {schedule.closingTime}
                  </span>
                </div>
                {schedule.notes && <p className="schedule-notes">{schedule.notes}</p>}
                {isOwnerOrManager && (
                  <div className="schedule-actions">
                    <button className="icon-btn" onClick={() => openEditSchedule(schedule)} title="Edit">
                      <Pencil size={14} />
                    </button>
                    <button className="icon-btn" onClick={() => setDeleteScheduleModal(schedule)} title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notice Add/Edit Modal */}
      {noticeModal && (
        <div className="modal-overlay" onClick={() => setNoticeModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{noticeModal === "add" ? "Post New Notice" : "Edit Notice"}</h2>
              <button className="icon-btn" onClick={() => setNoticeModal(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <label className="form-label">Title *</label>
                <input
                  className="haven-input-sm"
                  value={noticeForm.title}
                  onChange={(e) => setNoticeForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Inventory Check Reminder"
                />
              </div>
              <div className="form-row">
                <label className="form-label">Content *</label>
                <textarea
                  className="haven-input-sm"
                  rows={4}
                  value={noticeForm.content}
                  onChange={(e) => setNoticeForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="Notice details..."
                  style={{ resize: "vertical" }}
                />
              </div>
              <div className="form-row">
                <label className="form-label">Priority</label>
                <div className="priority-toggle-row">
                  {(["normal", "high", "urgent"] as NoticePriority[]).map((p) => (
                    <button
                      key={p}
                      className={`priority-toggle-btn ${noticeForm.priority === p ? "priority-toggle-active" : ""}`}
                      onClick={() => setNoticeForm((f) => ({ ...f, priority: p }))}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="haven-btn-ghost" onClick={() => setNoticeModal(null)}>
                Cancel
              </button>
              <button className="haven-btn-primary" onClick={handleSaveNotice}>
                {noticeModal === "add" ? "Post Notice" : "Update Notice"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notice Delete Modal */}
      {deleteNoticeModal && (
        <div className="modal-overlay" onClick={() => setDeleteNoticeModal(null)}>
          <div className="modal-box modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Delete Notice</h2>
              <button className="icon-btn" onClick={() => setDeleteNoticeModal(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ color: "var(--cream-muted)", lineHeight: 1.6 }}>
                Are you sure you want to delete "{deleteNoticeModal.title}"? This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button className="haven-btn-ghost" onClick={() => setDeleteNoticeModal(null)}>
                Cancel
              </button>
              <button className="haven-btn-danger" onClick={handleDeleteNotice}>
                Delete Notice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Add/Edit Modal */}
      {scheduleModal && (
        <div className="modal-overlay" onClick={() => setScheduleModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{scheduleModal === "add" ? "Add Schedule Entry" : "Edit Schedule"}</h2>
              <button className="icon-btn" onClick={() => setScheduleModal(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <label className="form-label">Date *</label>
                <input
                  className="haven-input-sm"
                  type="date"
                  value={scheduleForm.date}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className="form-row-2col">
                <div className="form-row">
                  <label className="form-label">Opening Time *</label>
                  <input
                    className="haven-input-sm"
                    type="time"
                    value={scheduleForm.openingTime}
                    onChange={(e) => setScheduleForm((f) => ({ ...f, openingTime: e.target.value }))}
                  />
                </div>
                <div className="form-row">
                  <label className="form-label">Closing Time *</label>
                  <input
                    className="haven-input-sm"
                    type="time"
                    value={scheduleForm.closingTime}
                    onChange={(e) => setScheduleForm((f) => ({ ...f, closingTime: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-row">
                <label className="form-label">Notes (optional)</label>
                <input
                  className="haven-input-sm"
                  value={scheduleForm.notes}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="e.g. Holiday hours, Special event"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="haven-btn-ghost" onClick={() => setScheduleModal(null)}>
                Cancel
              </button>
              <button className="haven-btn-primary" onClick={handleSaveSchedule}>
                {scheduleModal === "add" ? "Add Schedule" : "Update Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Delete Modal */}
      {deleteScheduleModal && (
        <div className="modal-overlay" onClick={() => setDeleteScheduleModal(null)}>
          <div className="modal-box modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Delete Schedule</h2>
              <button className="icon-btn" onClick={() => setDeleteScheduleModal(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ color: "var(--cream-muted)", lineHeight: 1.6 }}>
                Are you sure you want to delete the schedule for {new Date(deleteScheduleModal.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}? This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button className="haven-btn-ghost" onClick={() => setDeleteScheduleModal(null)}>
                Cancel
              </button>
              <button className="haven-btn-danger" onClick={handleDeleteSchedule}>
                Delete Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

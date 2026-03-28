import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard, Users, Clock, ClipboardList,
  LogOut, Wine, ChevronRight, AlertTriangle, Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, ownerOnly: false, managerOnly: false },
  { to: "/clock", label: "Clock In/Out", icon: Clock, ownerOnly: false, managerOnly: false },
  { to: "/shifts", label: "My Shifts", icon: ClipboardList, ownerOnly: false, managerOnly: false },
  { to: "/injury-report", label: "My Injury Reports", icon: AlertTriangle, ownerOnly: false, managerOnly: false, hideForManager: true },
  { to: "/employees", label: "Employees", icon: Users, ownerOnly: true, managerOnly: false },
  { to: "/manage-shifts", label: "Manage Shifts", icon: ClipboardList, ownerOnly: true, managerOnly: false },
  { to: "/manage-injuries", label: "Injury Reports", icon: AlertTriangle, ownerOnly: true, managerOnly: false },
  { to: "/job-titles", label: "Job Titles", icon: Briefcase, ownerOnly: true, managerOnly: false },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout, isOwnerOrManager } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out successfully.");
    navigate("/");
  };

  const visibleNav = navItems.filter(n => {
    if (n.ownerOnly && !isOwnerOrManager) return false;
    if ((n as any).hideForManager && isOwnerOrManager) return false;
    return true;
  });

  return (
    <div className="shell-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="brand-icon">
            <Wine size={20} style={{ color: "var(--gold)" }} />
          </div>
          <div>
            <p className="brand-title">The Haven</p>
            <p className="brand-sub">Speakeasy</p>
          </div>
        </div>

        <div className="sidebar-divider" />

        {/* User Info */}
        <div className="sidebar-user">
          {user?.avatarUrl ? (
            <div className="sidebar-avatar-photo">
              <img src={user.avatarUrl} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          ) : (
            <div className="avatar-circle">{user?.avatarInitials}</div>
          )}
          <div className="overflow-hidden">
            <p className="sidebar-user-name">{user?.name}</p>
            <p className="sidebar-user-role">{user?.role}</p>
          </div>
        </div>

        <div className="sidebar-divider" />

        {/* Nav */}
        <nav className="sidebar-nav">
          {visibleNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn("nav-link", isActive && "nav-link-active")}
            >
              <item.icon size={17} />
              <span>{item.label}</span>
              <ChevronRight size={14} className="nav-chevron" />
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-spacer" />

        {/* Logout */}
        <button onClick={handleLogout} className="nav-link sidebar-logout">
          <LogOut size={17} />
          <span>Sign Out</span>
        </button>
      </aside>

      {/* Main content */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

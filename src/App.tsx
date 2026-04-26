import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { Routes, Route, BrowserRouter, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Login from "@/pages/Login";

import Dashboard from "@/pages/Dashboard";
import ClockPage from "@/pages/ClockPage";
import MyShifts from "@/pages/MyShifts";
import Employees from "@/pages/Employees";
import ManageShifts from "@/pages/ManageShifts";
import InjuryReport from "@/pages/InjuryReport";
import ManageInjuries from "@/pages/ManageInjuries";
import JobTitles from "@/pages/JobTitles";
import StockManagement from "@/pages/StockManagement";
import DebtCollection from "@/pages/DebtCollection";
import BannedIndividuals from "@/pages/BannedIndividuals";
import NoticesAndScheduling from "@/pages/NoticesAndScheduling";
import EmployeeStats from "@/pages/EmployeeStats";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isRestoring } = useAuth();
  if (isRestoring) return <AppLoader />;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function ManagerRoute({ children }: { children: React.ReactNode }) {
  const { user, isOwnerOrManager, isRestoring } = useAuth();
  if (isRestoring) return <AppLoader />;
  if (!user) return <Navigate to="/" replace />;
  if (!isOwnerOrManager) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function CollectorRoute({ children }: { children: React.ReactNode }) {
  const { user, isOwnerOrManager, isRestoring } = useAuth();
  if (isRestoring) return <AppLoader />;
  if (!user) return <Navigate to="/" replace />;
  // Allow Owner, Manager, or Collector role
  if (!isOwnerOrManager && user.role !== "Collector") return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppLoader() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--dark-900)",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          border: "3px solid rgba(201,168,76,0.2)",
          borderTopColor: "var(--gold)",
          animation: "spin 0.8s linear infinite",
          margin: "0 auto 12px",
        }} />
        <p style={{ color: "var(--cream-muted)", fontSize: "0.8rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Loading…
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function AppRoutes() {
  const { user, isRestoring } = useAuth();
  if (isRestoring) return <AppLoader />;
  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/clock" element={<ProtectedRoute><ClockPage /></ProtectedRoute>} />
      <Route path="/shifts" element={<ProtectedRoute><MyShifts /></ProtectedRoute>} />
      <Route path="/employees" element={<ManagerRoute><Employees /></ManagerRoute>} />
      <Route path="/manage-shifts" element={<ManagerRoute><ManageShifts /></ManagerRoute>} />
      <Route path="/injury-report" element={<ProtectedRoute><InjuryReport /></ProtectedRoute>} />
      <Route path="/manage-injuries" element={<ManagerRoute><ManageInjuries /></ManagerRoute>} />
      <Route path="/job-titles" element={<ManagerRoute><JobTitles /></ManagerRoute>} />
      <Route path="/stock" element={<ManagerRoute><StockManagement /></ManagerRoute>} />
      <Route path="/debt-collection" element={<CollectorRoute><DebtCollection /></CollectorRoute>} />
      <Route path="/banned-individuals" element={<ProtectedRoute><BannedIndividuals /></ProtectedRoute>} />
      <Route path="/notices" element={<ProtectedRoute><NoticesAndScheduling /></ProtectedRoute>} />
      <Route path="/employee-stats" element={<ManagerRoute><EmployeeStats /></ManagerRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

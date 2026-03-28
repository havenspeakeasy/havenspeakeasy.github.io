import React, { createContext, useContext, useState, useEffect } from "react";
import { type Employee, getCurrentUser, logout as storeLogout } from "@/lib/store";
import { getAdminRoleNames, refreshAdminRoleNamesCache } from "@/lib/jobTitlesStore";

type AuthContextType = {
  user: Employee | null;
  setUser: (u: Employee | null) => void;
  logout: () => void;
  isOwnerOrManager: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  logout: () => {},
  isOwnerOrManager: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Employee | null>(getCurrentUser());
  const [adminCacheReady, setAdminCacheReady] = useState(false);

  useEffect(() => {
    // Hydrate user from localStorage (handles page refreshes)
    const restored = getCurrentUser();
    if (restored) setUser(restored);

    // Refresh admin role cache so isOwnerOrManager is accurate
    refreshAdminRoleNamesCache()
      .catch(console.error)
      .finally(() => setAdminCacheReady(true));
  }, []);

  const logout = async () => {
    await storeLogout();
    setUser(null);
  };

  // Re-compute whenever user or cache readiness changes
  const isOwnerOrManager = adminCacheReady && user ? getAdminRoleNames().includes(user.role) : user ? getAdminRoleNames().includes(user.role) : false;

  return (
    <AuthContext.Provider value={{ user, setUser, logout, isOwnerOrManager }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
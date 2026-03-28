import React, { createContext, useContext, useState, useEffect } from "react";
import { type Employee, restoreSession, logout as storeLogout } from "@/lib/store";
import { getAdminRoleNames, refreshAdminRoleNamesCache } from "@/lib/jobTitlesStore";

type AuthContextType = {
  user: Employee | null;
  setUser: (u: Employee | null) => void;
  logout: () => void;
  isOwnerOrManager: boolean;
  isRestoring: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  logout: () => {},
  isOwnerOrManager: false,
  isRestoring: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Employee | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    // Restore session from Supabase on page load
    (async () => {
      await refreshAdminRoleNamesCache();
      const restored = await restoreSession();
      if (restored) setUser(restored);
      setIsRestoring(false);
    })();
  }, []);

  const logout = async () => {
    await storeLogout();
    setUser(null);
  };

  const isOwnerOrManager = user ? getAdminRoleNames().includes(user.role) : false;

  return (
    <AuthContext.Provider value={{ user, setUser, logout, isOwnerOrManager, isRestoring }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

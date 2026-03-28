import React, { createContext, useContext, useState, useEffect } from "react";
import { type Employee, getCurrentUser, logout as storeLogout } from "@/lib/store";
import { getAdminRoleNames } from "@/lib/jobTitlesStore";

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

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  const logout = async () => {
    await storeLogout();
    setUser(null);
  };

  const isOwnerOrManager = user ? getAdminRoleNames().includes(user.role) : false;

  return (
    <AuthContext.Provider value={{ user, setUser, logout, isOwnerOrManager }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

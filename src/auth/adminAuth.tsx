import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "obera_admin_auth";
const ADMIN_ID = "SAV";
const ADMIN_PIN = "1789";

type AdminAuthContextValue = {
  isAuthenticated: boolean;
  login: (adminId: string, pin: string) => boolean;
  logout: () => void;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsAuthenticated(window.sessionStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      isAuthenticated,
      login: (adminId, pin) => {
        const ok =
          adminId.trim().toUpperCase() === ADMIN_ID && pin.trim() === ADMIN_PIN;
        if (ok) {
          setIsAuthenticated(true);
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(STORAGE_KEY, "1");
          }
        }
        return ok;
      },
      logout: () => {
        setIsAuthenticated(false);
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(STORAGE_KEY);
        }
      }
    }),
    [isAuthenticated]
  );

  return (
    <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  }
  return ctx;
}


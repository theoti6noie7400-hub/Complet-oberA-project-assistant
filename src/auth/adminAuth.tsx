import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type InternalRole =
  | "global_admin" | "sav_manager" | "sav_technician" | "marketing"
  | "sales" | "adv" | "logistics";

const internalRoles = new Set<InternalRole>([
  "global_admin", "sav_manager", "sav_technician", "marketing", "sales", "adv", "logistics"
]);

export type AdminSession = {
  isLoading: boolean;
  isAuthenticated: boolean;
  role: InternalRole | null;
};

type AdminAuthContextValue = AdminSession & {
  login: (identifier: string, pin: string) => Promise<InternalRole | null>;
  logout: () => Promise<boolean>;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);
const emptySession: AdminSession = { isLoading: false, isAuthenticated: false, role: null };

export function canUseInternalPath(role: InternalRole | null, pathname: string): boolean {
  if (!role) return false;
  if (role === "global_admin") return pathname === "/sav-maintenance" ||
    pathname === "/charbon-actif" ||
    ["marketing", "commercial", "adv", "logistique"].some(key => pathname === `/service/${key}`);
  if (pathname === "/sav-maintenance" || pathname === "/charbon-actif")
    return role === "sav_manager" || role === "sav_technician";
  const servicePath: Partial<Record<InternalRole, string>> = {
    marketing: "/service/marketing", sales: "/service/commercial",
    adv: "/service/adv", logistics: "/service/logistique"
  };
  return servicePath[role] === pathname;
}

async function readSession(): Promise<AdminSession> {
  const response = await fetch("/api/session", { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) return emptySession;
  const principal = await response.json() as { role?: InternalRole };
  if (!principal.role || !internalRoles.has(principal.role)) return emptySession;
  return { ...emptySession, isAuthenticated: true, role: principal.role };
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AdminSession>({ ...emptySession, isLoading: true });

  useEffect(() => {
    // An old or manually edited prototype session never grants access.
    window.sessionStorage.removeItem("obera_admin_auth");
    let active = true;
    readSession().then(next => { if (active) setSession(next); })
      .catch(() => { if (active) setSession(emptySession); });
    return () => { active = false; };
  }, []);

  const value = useMemo<AdminAuthContextValue>(() => ({
    ...session,
    login: async (identifier, pin) => {
      try {
        const response = await fetch("/api/login", {
          method: "POST", credentials: "same-origin", cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier, pin })
        });
        if (!response.ok) return null;
        const verified = await readSession();
        setSession(verified);
        return verified.role;
      } catch { return null; }
    },
    logout: async () => {
      try {
        const response = await fetch("/api/logout", {
          method: "POST", credentials: "same-origin", cache: "no-store"
        });
        if (!response.ok) return false;
        setSession(emptySession);
        return true;
      } catch { return false; }
    }
  }), [session]);

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  return ctx;
}

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type InternalRole =
  | "global_admin" | "sav_manager" | "sav_technician" | "marketing"
  | "commercial" | "sales" | "adv" | "logistics";
export type ExternalRole = "client" | "reseller";

const internalRoles = new Set<InternalRole>([
  "global_admin", "sav_manager", "sav_technician", "commercial", "marketing", "sales", "adv", "logistics"
]);

export type AdminSession = {
  isLoading: boolean;
  isAuthenticated: boolean;
  role: InternalRole | null;
  externalRole: ExternalRole | null;
  externalOrganizationId: string | null;
};

type AdminAuthContextValue = AdminSession & {
  login: (identifier: string, pin: string) => Promise<InternalRole | null>;
  loginExternal: (role: ExternalRole, identifier: string, pin: string) => Promise<boolean>;
  logout: () => Promise<boolean>;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);
const emptySession: AdminSession = { isLoading: false, isAuthenticated: false, role: null,
  externalRole: null, externalOrganizationId: null };

export function canUseInternalPath(role: InternalRole | null, pathname: string): boolean {
  if (!role) return false;
  if (pathname === "/sav-maintenance/client-preview" || pathname === "/sav-maintenance/clients" ||
    /^\/sav-maintenance\/clients\/[^/]+\/devices\/[^/]+$/.test(pathname))
    return ["global_admin", "sav_manager", "sav_technician", "commercial"].includes(role);
  if (role === "global_admin") return ["/sav-maintenance", "/sav-maintenance/clients"].includes(pathname) ||
    pathname === "/charbon-actif" ||
    ["marketing", "commercial", "adv", "logistique"].some(key => pathname === `/service/${key}`);
  if (["/sav-maintenance", "/sav-maintenance/clients", "/charbon-actif"].includes(pathname))
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
  const principal = await response.json() as { role?: InternalRole | ExternalRole; organizationIds?: string[] };
  if (principal.role === "client" || principal.role === "reseller") {
    if (principal.organizationIds?.length !== 1) return emptySession;
    return { ...emptySession, externalRole: principal.role,
      externalOrganizationId: principal.organizationIds[0] };
  }
  if (!principal.role || !internalRoles.has(principal.role as InternalRole)) return emptySession;
  return { ...emptySession, isAuthenticated: true, role: principal.role as InternalRole };
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AdminSession>({ ...emptySession, isLoading: true });

  useEffect(() => {
    // An old or manually edited prototype session never grants access.
    window.sessionStorage.removeItem("obera_admin_auth");
    let active = true;
    readSession().then(next => { if (active) setSession(next); })
      .catch(() => { if (active) setSession(emptySession); });
    const refresh = () => {
      if (!active || document.visibilityState === "hidden") return;
      setSession(current => ({ ...current, isLoading: true }));
      readSession().then(next => { if (active) setSession(next); })
        .catch(() => { if (active) setSession(emptySession); });
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { active = false; window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh); };
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
    loginExternal: async (role, identifier, pin) => {
      try {
        const response = await fetch(`/api/${role}/login`, {
          method: "POST", credentials: "same-origin", cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier, pin })
        });
        if (!response.ok) return false;
        const verified = await readSession();
        setSession(verified);
        return verified.externalRole === role;
      } catch { return false; }
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

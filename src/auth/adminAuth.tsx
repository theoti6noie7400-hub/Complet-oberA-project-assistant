import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "obera_admin_auth";
const ADMIN_PIN = "1789";

export type AdminRole = "global" | "service";

export type AdminSession = {
  isAuthenticated: boolean;
  role: AdminRole | null;
  serviceKey: string | null;
  displayName: string | null;
};

type AdminAuthContextValue = AdminSession & {
  login: (adminId: string, pin: string) => boolean;
  logout: () => void;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

const GLOBAL_ADMINS = new Map<string, string>([
  ["HERVEJEHEL", "HERVE JEHEL"],
  ["BANCHONPANITHTHEO", "BANCHONPANITH THEO"]
]);

const SERVICE_ADMINS = new Map<string, { serviceKey: string; label: string }>([
  ["SAV", { serviceKey: "sav-maintenance", label: "SAV / Maintenance" }],
  ["MAINTENANCE", { serviceKey: "sav-maintenance", label: "SAV / Maintenance" }],
  ["SAVMAINTENANCE", { serviceKey: "sav-maintenance", label: "SAV / Maintenance" }],
  ["MARKETING", { serviceKey: "marketing", label: "Marketing" }],
  ["COMMERCIAL", { serviceKey: "commercial", label: "Commercial" }],
  ["ADV", { serviceKey: "adv", label: "ADV" }],
  ["LOGISTIQUE", { serviceKey: "logistique", label: "Logistique" }]
]);

const normalizeId = (value: string) =>
  value
    .toUpperCase()
    .normalize("NFD")
    .replace(/[^A-Z0-9]+/g, "");

export type AdminAccessPreview =
  | { type: "global"; label: string }
  | { type: "service"; label: string; serviceKey: string }
  | { type: "unknown"; label: string };

export function getAdminAccessPreview(adminId: string): AdminAccessPreview {
  const cleanId = normalizeId(adminId);
  if (!cleanId) {
    return { type: "unknown", label: "" };
  }
  if (GLOBAL_ADMINS.has(cleanId)) {
    const displayName = GLOBAL_ADMINS.get(cleanId) ?? "ADMIN";
    return { type: "global", label: `Admin global ${displayName}` };
  }
  if (SERVICE_ADMINS.has(cleanId)) {
    const service = SERVICE_ADMINS.get(cleanId)!;
    return {
      type: "service",
      label: `Admin ${service.label}`,
      serviceKey: service.serviceKey
    };
  }
  return { type: "unknown", label: "Identifiant admin non reconnu" };
}

const emptySession: AdminSession = {
  isAuthenticated: false,
  role: null,
  serviceKey: null,
  displayName: null
};

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AdminSession>(emptySession);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as AdminSession;
      setSession({
        isAuthenticated: !!parsed.isAuthenticated,
        role: parsed.role ?? null,
        serviceKey: parsed.serviceKey ?? null,
        displayName: parsed.displayName ?? null
      });
    } catch {
      setSession(emptySession);
    }
  }, []);

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      ...session,
      login: (adminId, pin) => {
        const cleanId = normalizeId(adminId);
        const cleanPin = pin.trim();
        if (cleanPin !== ADMIN_PIN) return false;

        if (GLOBAL_ADMINS.has(cleanId)) {
          const displayName = GLOBAL_ADMINS.get(cleanId) ?? "ADMIN";
          const next: AdminSession = {
            isAuthenticated: true,
            role: "global",
            serviceKey: null,
            displayName
          };
          setSession(next);
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          }
          return true;
        }

        if (SERVICE_ADMINS.has(cleanId)) {
          const service = SERVICE_ADMINS.get(cleanId)!;
          const next: AdminSession = {
            isAuthenticated: true,
            role: "service",
            serviceKey: service.serviceKey,
            displayName: service.label
          };
          setSession(next);
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          }
          return true;
        }

        return false;
      },
      logout: () => {
        setSession(emptySession);
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(STORAGE_KEY);
        }
      }
    }),
    [session]
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

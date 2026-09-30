export type Role =
  | "global_admin"
  | "sav_manager"
  | "sav_technician"
  | "sales"
  | "adv"
  | "logistics"
  | "marketing"
  | "client"
  | "reseller";

export type Principal = {
  userId: string;
  role: Role;
  organizationIds: string[];
};

export type Resource =
  | { kind: "sav_case"; clientOrganizationId: string }
  | { kind: "contract"; clientOrganizationId: string }
  | { kind: "client_request"; organizationId: string }
  | { kind: "reseller_request"; organizationId: string }
  | { kind: "document"; organizationId: string | null; audience: "internal" | "client" | "reseller" };

export type Action = "read" | "create" | "update" | "update_technical" | "manage";

const savRoles: Role[] = ["global_admin", "sav_manager", "sav_technician"];

export function can(principal: Principal, action: Action, resource: Resource): boolean {
  if (!principal.userId) return false;
  if (!["global_admin", "sav_manager", "sav_technician", "client"].includes(principal.role)) return false;
  if (principal.role === "global_admin") return true;

  if (resource.kind === "sav_case") {
    // No transversal SAV access until the exact fields and scope are approved.
    if (principal.role === "sav_manager") return true;
    return principal.role === "sav_technician" &&
      (action === "read" || action === "create" || action === "update_technical");
  }
  if (resource.kind === "contract") {
    return savRoles.includes(principal.role) && action === "read";
  }
  if (resource.kind === "client_request") {
    if (principal.role === "sav_manager" || principal.role === "sav_technician") return action === "read";
    return principal.role === "client" && principal.organizationIds.includes(resource.organizationId) &&
      (action === "read" || action === "create");
  }
  if (resource.kind === "reseller_request") {
    return principal.role === "reseller" && principal.organizationIds.includes(resource.organizationId) &&
      (action === "read" || action === "create");
  }
  if (resource.kind === "document" && action === "read") {
    if (resource.audience === "internal") return savRoles.includes(principal.role);
    if (resource.organizationId === null || !principal.organizationIds.includes(resource.organizationId)) return false;
    return (principal.role === "client" && resource.audience === "client") ||
      (principal.role === "reseller" && resource.audience === "reseller");
  }
  return false;
}

export function canEnterService(principal: Principal, serviceKey: string): boolean {
  return serviceKey === "sav-maintenance" &&
    ["global_admin", "sav_manager", "sav_technician"].includes(principal.role);
}

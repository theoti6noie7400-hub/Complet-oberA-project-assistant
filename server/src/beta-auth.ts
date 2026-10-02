import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import type { Database } from "./db.ts";
import type { Role } from "./access.ts";

export type InternalRole = Extract<Role,
  "global_admin" | "sav_manager" | "sav_technician" | "commercial" | "marketing" | "sales" | "adv" | "logistics">;

const internalRoles = new Set<InternalRole>(["global_admin", "sav_manager", "sav_technician", "commercial"]);
const retiredRoles = new Set(["marketing", "sales", "adv", "logistics"]);
const issuer = "urn:obera:beta:internal";
const dummySalt = randomBytes(16);
const dummyHash = randomBytes(64);

export type BetaAccount = { identifier: string; role: InternalRole; salt: Buffer; pinHash: Buffer };

export function loadBetaAccounts(value: string | undefined): BetaAccount[] {
  if (!value) throw new Error("BETA_INTERNAL_ACCOUNTS is required");
  const raw: unknown = JSON.parse(value);
  if (!Array.isArray(raw) || raw.length === 0) throw new Error("At least one beta account is required");
  const seen = new Set<string>();
  const accounts = raw.flatMap((entry: unknown) => {
    if (!entry || typeof entry !== "object") throw new Error("Invalid beta account");
    const account = entry as Record<string, unknown>;
    const identifier = typeof account.identifier === "string" ? account.identifier.trim().toUpperCase() : "";
    if (!/^[A-Z0-9._-]{3,80}$/.test(identifier) || seen.has(identifier) ||
      typeof account.pin !== "string" || !/^\d{4,12}$/.test(account.pin) ||
      !(internalRoles.has(account.role as InternalRole) || retiredRoles.has(account.role as string)))
      throw new Error("Invalid or duplicate beta account");
    seen.add(identifier);
    // Existing beta configuration may still list retired accounts. Never issue them a login.
    if (!internalRoles.has(account.role as InternalRole)) return [];
    const salt = randomBytes(16);
    return [{ identifier, role: account.role as InternalRole, salt,
      pinHash: scryptSync(account.pin, salt, 64) }];
  });
  if (!accounts.length) throw new Error("At least one SAV beta account is required");
  return accounts;
}

export function verifyBetaAccount<T extends { identifier: string; salt: Buffer; pinHash: Buffer }>(
  accounts: T[], identifier: string, pin: string): T | null {
  const id = identifier.trim().toUpperCase();
  const account = accounts.find(item => item.identifier === id);
  const candidate = scryptSync(pin, account?.salt ?? dummySalt, 64);
  return timingSafeEqual(candidate, account?.pinHash ?? dummyHash) ? account ?? null : null;
}

export async function provisionBetaUser(db: Database, account: BetaAccount): Promise<string | null> {
  const result = await db.query(`INSERT INTO users (id, identity_issuer, identity_subject, role)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (identity_issuer, identity_subject) DO UPDATE SET role = EXCLUDED.role
    WHERE users.active = true RETURNING id`,
  [randomUUID(), issuer, account.identifier, account.role]);
  return result.rows[0]?.id ?? null;
}

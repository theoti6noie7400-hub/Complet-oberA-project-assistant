import { createHash, randomBytes } from "node:crypto";
import type { Database } from "./db.ts";
import type { Principal, Role } from "./access.ts";

export const sessionCookie = "obera_session";
export const sessionLifetimeMs = 8 * 60 * 60 * 1000;
const activeRoles: Role[] = ["global_admin", "sav_manager", "sav_technician", "client"];

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

export function readSessionToken(cookieHeader: string | undefined): string | null {
  const part = cookieHeader?.split(";").map(s => s.trim()).find(s => s.startsWith(`${sessionCookie}=`));
  const token = part?.slice(sessionCookie.length + 1);
  return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
}

export async function findPrincipal(db: Database, cookieHeader: string | undefined): Promise<Principal | null> {
  const token = readSessionToken(cookieHeader);
  if (!token) return null;
  const result = await db.query(`
    SELECT u.id, u.role, m.organization_id, o.kind AS organization_kind
    FROM sessions s JOIN users u ON u.id = s.user_id
    LEFT JOIN user_organizations m ON m.user_id = u.id
    LEFT JOIN organizations o ON o.id = m.organization_id
    WHERE s.token_hash = $1 AND s.expires_at > now() AND u.active = true
  `, [tokenHash(token)]);
  if (!result.rows.length) return null;
  const user = result.rows[0];
  if (!activeRoles.includes(user.role as Role)) return null;
  const external = user.role === "client" || user.role === "reseller";
  if (external && (result.rows.length !== 1 || user.organization_id === null ||
    user.organization_kind !== user.role)) return null;
  return { userId: user.id, role: user.role as Role,
    organizationIds: external ? result.rows.map(row => row.organization_id as string) : [] };
}

export async function revokeLegacySessions(db: Database): Promise<void> {
  await db.query(`DELETE FROM sessions s USING users u WHERE s.user_id = u.id
    AND u.role NOT IN ('global_admin', 'sav_manager', 'sav_technician', 'client')`);
}

// Only the future verified OIDC callback may call this function; it is not an HTTP endpoint.
export async function issueSession(db: Database, userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const result = await db.query(`INSERT INTO sessions (token_hash, user_id, expires_at)
    SELECT $1, id, $2 FROM users WHERE id = $3 AND active = true RETURNING token_hash`,
  [tokenHash(token), new Date(Date.now() + sessionLifetimeMs), userId]);
  if (result.rowCount !== 1) throw new Error("Inactive or unknown identity");
  return token;
}

export async function revokeSession(db: Database, cookieHeader: string | undefined): Promise<void> {
  const token = readSessionToken(cookieHeader);
  if (token) await db.query("DELETE FROM sessions WHERE token_hash = $1", [tokenHash(token)]);
}

export function sessionSetCookie(token: string, secure = true): string {
  return `${sessionCookie}=${token}; Path=/; Max-Age=${sessionLifetimeMs / 1000}; HttpOnly; ${secure ? "Secure; " : ""}SameSite=Lax`;
}

export function sessionClearCookie(secure = true): string {
  return `${sessionCookie}=; Path=/; Max-Age=0; HttpOnly; ${secure ? "Secure; " : ""}SameSite=Lax`;
}

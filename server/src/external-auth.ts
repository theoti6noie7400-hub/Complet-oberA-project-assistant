import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import type { Database } from "./db.ts";
import { verifyBetaAccount } from "./beta-auth.ts";

export type ExternalRole = "client" | "reseller";
export type ExternalAccount = { identifier: string; role: ExternalRole;
  organizationId: string; salt: Buffer; pinHash: Buffer };
const issuer = "urn:obera:beta:external";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function loadExternalAccounts(value: string | undefined): ExternalAccount[] {
  if (!value) throw new Error("BETA_EXTERNAL_ACCOUNTS is required");
  const raw: unknown = JSON.parse(value);
  if (!Array.isArray(raw) || raw.length === 0) throw new Error("At least one external beta account is required");
  const seen = new Set<string>();
  const accounts = raw.flatMap((entry: unknown) => {
    if (!entry || typeof entry !== "object") throw new Error("Invalid external beta account");
    const item = entry as Record<string, unknown>;
    const identifier = typeof item.identifier === "string" ? item.identifier.trim().toUpperCase() : "";
    if (!/^[A-Z0-9._-]{3,80}$/.test(identifier) || seen.has(identifier) ||
      typeof item.pin !== "string" || !/^\d{4,12}$/.test(item.pin) ||
      (item.role !== "client" && item.role !== "reseller") ||
      typeof item.organizationId !== "string" || !uuidPattern.test(item.organizationId))
      throw new Error("Invalid or duplicate external beta account");
    seen.add(identifier);
    // Preserve old configuration without allowing new reseller logins.
    if (item.role === "reseller") return [];
    const salt = randomBytes(16);
    return [{ identifier, role: "client" as const, organizationId: item.organizationId.toLowerCase(),
      salt, pinHash: scryptSync(item.pin, salt, 64) }];
  });
  if (!accounts.length) throw new Error("At least one client beta account is required");
  return accounts;
}

export function verifyExternalAccount(accounts: ExternalAccount[], identifier: string, pin: string,
  role: ExternalRole): ExternalAccount | null {
  const match = verifyBetaAccount(accounts.filter(account => account.role === role), identifier, pin);
  return match;
}

export async function provisionExternalUser(db: Database, account: ExternalAccount): Promise<string | null> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const organization = await client.query("SELECT id FROM organizations WHERE id = $1 AND kind = $2",
      [account.organizationId, account.role]);
    if (organization.rowCount !== 1) { await client.query("ROLLBACK"); return null; }
    const result = await client.query(`INSERT INTO users (id, identity_issuer, identity_subject, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (identity_issuer, identity_subject) DO UPDATE SET role = EXCLUDED.role
      WHERE users.active = true AND users.role = EXCLUDED.role RETURNING id`,
    [randomUUID(), issuer, account.identifier, account.role]);
    const userId = result.rows[0]?.id as string | undefined;
    if (!userId) { await client.query("ROLLBACK"); return null; }
    // The upsert locks this user row. Never silently move an existing identity to another organization.
    const links = await client.query("SELECT organization_id FROM user_organizations WHERE user_id = $1",
      [userId]);
    if (links.rows.length === 0)
      await client.query("INSERT INTO user_organizations (user_id, organization_id) VALUES ($1, $2)",
        [userId, account.organizationId]);
    else if (links.rows.length !== 1 || links.rows[0].organization_id !== account.organizationId) {
      await client.query("ROLLBACK"); return null;
    }
    await client.query("COMMIT");
    return userId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

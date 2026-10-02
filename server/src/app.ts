import { createHash, randomUUID } from "node:crypto";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { can, type Principal } from "./access.ts";
import { provisionBetaUser, verifyBetaAccount, type BetaAccount } from "./beta-auth.ts";
import { provisionExternalUser, verifyExternalAccount, type ExternalAccount, type ExternalRole } from "./external-auth.ts";
import { registerExternalRoutes } from "./external-routes.ts";
import { registerInternalParkRoutes } from "./internal-park.ts";
import { registerPortalRequestRoutes } from "./portal-requests.ts";
import type { Database } from "./db.ts";
import { findPrincipal, issueSession, revokeSession, sessionClearCookie, sessionSetCookie } from "./session.ts";

const uuid = { type: "string", format: "uuid" } as const;
const caseFields = `id, display_reference, sav_reference, serial_number, client_name,
  client_number, client_organization_id, model, site, problem, cause, sav_action,
  sav_type, status, created_at, updated_at`;

type ManualSavInput = {
  submissionKey: string; savReference: string; serialNumber: string;
  clientName: string; clientNumber: string; model: string; site: string;
  problem: string; cause: string; savAction: string;
  savType: "technique" | "usure" | "fournisseur" | "casse" | "autre";
};

export function createApp(db: Database, publicOrigin: string, betaAccounts: BetaAccount[] = [],
  externalAccounts: ExternalAccount[] = [], options: { externalAccessEnabled?: boolean } = {}) {
  // Request paths can contain case identifiers; audit writes are stored separately.
  const app = Fastify({ logger: process.env.NODE_ENV === "production", bodyLimit: 64 * 1024 });
  const secureCookie = publicOrigin.startsWith("https://");
  const failedLogins = new Map<string, { count: number; resetAt: number }>();

  function sameOrigin(origin: string | undefined): boolean {
    return origin === publicOrigin;
  }

  async function authorized(cookie: string | undefined): Promise<Principal | null> {
    return findPrincipal(db, cookie);
  }

  app.get("/api/health", async () => ({ status: "ok" }));

  app.get("/api/ready", async (_request, reply) => {
    try {
      await db.query("SELECT 1");
      return { status: "ready" };
    } catch {
      return reply.code(503).send({ status: "unavailable" });
    }
  });

  app.get("/api/session", async (request, reply) => {
    const principal = await authorized(request.headers.cookie);
    if (!principal) return reply.code(401).send({ error: "authentication_required" });
    if (!options.externalAccessEnabled && ["client", "reseller"].includes(principal.role))
      return reply.code(401).send({ error: "authentication_required" });
    return reply.header("Cache-Control", "no-store").send(principal);
  });

  // Keep the old URL inert: the former no-PIN recipe endpoint must not issue a session.
  app.post("/api/recipe/session", async (_request, reply) =>
    reply.code(410).send({ error: "recipe_session_disabled" }));

  const loginSchema = { body: {
    type: "object", additionalProperties: false, required: ["identifier", "pin"],
    properties: {
      identifier: { type: "string", minLength: 1, maxLength: 80 },
      pin: { type: "string", minLength: 4, maxLength: 12, pattern: "^\\d+$" }
    }
  } } as const;

  async function login(request: FastifyRequest, reply: FastifyReply, realm: "internal" | ExternalRole) {
    if (!sameOrigin(request.headers.origin)) return reply.code(403).send({ error: "origin_denied" });
    const { identifier, pin } = request.body as { identifier: string; pin: string };
    const now = Date.now();
    const keys = [`ip:${request.ip}`, `id:${request.ip}:${realm}:${identifier.trim().toUpperCase()}`];
    if (keys.some(key => {
      const failure = failedLogins.get(key);
      return failure && failure.resetAt > now && failure.count >= (key.startsWith("ip:") ? 10 : 5);
    })) return reply.code(429).send({ error: "too_many_attempts" });

    const account = realm === "internal" ? verifyBetaAccount(betaAccounts, identifier, pin)
      : verifyExternalAccount(externalAccounts, identifier, pin, realm);
    if (!account || !["global_admin", "sav_manager", "sav_technician", "commercial", "client"].includes(account.role)) {
      for (const key of keys) {
        const previous = failedLogins.get(key);
        failedLogins.set(key, { count: previous && previous.resetAt > now ? previous.count + 1 : 1,
          resetAt: previous && previous.resetAt > now ? previous.resetAt : now + 15 * 60 * 1000 });
      }
      return reply.code(401).send({ error: "invalid_credentials" });
    }
    const userId = realm === "internal" ? await provisionBetaUser(db, account as BetaAccount)
      : await provisionExternalUser(db, account as ExternalAccount);
    if (!userId) return reply.code(401).send({ error: "invalid_credentials" });
    for (const key of keys) failedLogins.delete(key);
    await revokeSession(db, request.headers.cookie);
    const token = await issueSession(db, userId);
    return reply.header("Set-Cookie", sessionSetCookie(token, secureCookie))
      .header("Cache-Control", "no-store").send({ role: account.role });
  }

  app.post("/api/login", { schema: loginSchema }, (request, reply) => login(request, reply, "internal"));
  app.post("/api/client/login", { schema: loginSchema }, (request, reply) =>
    options.externalAccessEnabled ? login(request, reply, "client") :
      reply.code(410).send({ error: "client_access_closed" }));
  app.post("/api/reseller/login", async (_request, reply) =>
    reply.code(410).send({ error: "reseller_access_closed" }));

  app.post("/api/logout", async (request, reply) => {
    if (!sameOrigin(request.headers.origin)) return reply.code(403).send({ error: "origin_denied" });
    await revokeSession(db, request.headers.cookie);
    return reply.header("Set-Cookie", sessionClearCookie(secureCookie))
      .header("Cache-Control", "no-store").code(204).send();
  });

  app.get("/api/sav/cases", async (request, reply) => {
    const principal = await authorized(request.headers.cookie);
    if (!principal) return reply.code(401).send({ error: "authentication_required" });
    if (!can(principal, "read", { kind: "sav_case", clientOrganizationId: "" }))
      return reply.code(403).send({ error: "access_denied" });
    const result = await db.query(`SELECT ${caseFields} FROM sav_cases ORDER BY created_at DESC LIMIT 100`);
    return { cases: result.rows };
  });

  app.get("/api/sav/cases/:id", { schema: { params: { type: "object", required: ["id"], properties: { id: uuid } } } },
    async (request, reply) => {
      const principal = await authorized(request.headers.cookie);
      if (!principal) return reply.code(401).send({ error: "authentication_required" });
      if (!can(principal, "read", { kind: "sav_case", clientOrganizationId: "" }))
        return reply.code(403).send({ error: "access_denied" });
      const { id } = request.params as { id: string };
      const result = await db.query(`SELECT ${caseFields} FROM sav_cases WHERE id = $1`, [id]);
      if (!result.rows.length) return reply.code(404).send({ error: "not_found" });
      const item = result.rows[0];
      if (!can(principal, "read", { kind: "sav_case", clientOrganizationId: item.client_organization_id ?? "" }))
        return reply.code(403).send({ error: "access_denied" });
      return item;
    });

  app.post("/api/sav/cases", { schema: { body: {
    type: "object", additionalProperties: false,
    required: ["submissionKey", "savReference", "serialNumber", "clientName", "clientNumber", "model", "site", "problem", "cause", "savAction", "savType"],
    properties: {
      submissionKey: uuid,
      savReference: { type: "string", maxLength: 200 },
      serialNumber: { type: "string", maxLength: 200 },
      clientName: { type: "string", maxLength: 300 },
      clientNumber: { type: "string", maxLength: 100 },
      model: { type: "string", minLength: 1, maxLength: 200 },
      site: { type: "string", minLength: 1, maxLength: 300 },
      problem: { type: "string", minLength: 1, maxLength: 10000, pattern: "\\S" },
      cause: { type: "string", minLength: 1, maxLength: 10000, pattern: "\\S" },
      savAction: { type: "string", minLength: 1, maxLength: 10000, pattern: "\\S" },
      savType: { type: "string", enum: ["technique", "usure", "fournisseur", "casse", "autre"] }
    }
  } } }, async (request, reply) => {
    const principal = await authorized(request.headers.cookie);
    if (!principal) return reply.code(401).send({ error: "authentication_required" });
    if (!sameOrigin(request.headers.origin)) return reply.code(403).send({ error: "origin_denied" });
    const input = request.body as ManualSavInput;
    if (!can(principal, "create", { kind: "sav_case", clientOrganizationId: "" }))
      return reply.code(403).send({ error: "access_denied" });
    const id = randomUUID();
    const payload = [input.savReference, input.serialNumber, input.clientName,
      input.clientNumber, input.model, input.site, input.problem, input.cause,
      input.savAction, input.savType];
    const requestHash = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(`INSERT INTO sav_cases
        (id, sav_reference, serial_number, client_name, client_number, model, site,
         problem, cause, sav_action, sav_type, created_by, submission_key, request_hash)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        ON CONFLICT (created_by, submission_key) DO NOTHING
        RETURNING ${caseFields}`,
      [id, ...payload, principal.userId, input.submissionKey, requestHash]);
      if (!result.rows.length) {
        const existing = await client.query(`SELECT ${caseFields}, request_hash FROM sav_cases
          WHERE created_by = $1 AND submission_key = $2`, [principal.userId, input.submissionKey]);
        await client.query("COMMIT");
        if (existing.rows[0]?.request_hash !== requestHash)
          return reply.code(409).send({ error: "submission_key_conflict" });
        const { request_hash: _hash, ...caseRecord } = existing.rows[0];
        return reply.code(200).send(caseRecord);
      }
      await client.query(`INSERT INTO audit_events (actor_user_id, action, resource_kind, resource_id)
        VALUES ($1, 'create', 'sav_case', $2)`, [principal.userId, id]);
      await client.query("COMMIT");
      return reply.code(201).send(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  });

  app.get("/api/sav/contracts", async (request, reply) => {
    const principal = await authorized(request.headers.cookie);
    if (!principal) return reply.code(401).send({ error: "authentication_required" });
    if (!can(principal, "read", { kind: "contract", clientOrganizationId: "" }))
      return reply.code(403).send({ error: "access_denied" });
    const result = await db.query(`SELECT c.*, COALESCE(json_agg(json_build_object('model', d.model,
      'qty', d.quantity)) FILTER (WHERE d.model IS NOT NULL), '[]'::json) AS devices
      FROM contracts c LEFT JOIN contract_devices d ON d.contract_id = c.id
      GROUP BY c.id ORDER BY c.id LIMIT 100`);
    return { contracts: result.rows };
  });

  if (options.externalAccessEnabled) registerExternalRoutes(app, db, publicOrigin);
  registerInternalParkRoutes(app, db);
  registerPortalRequestRoutes(app, db, publicOrigin);

  return app;
}

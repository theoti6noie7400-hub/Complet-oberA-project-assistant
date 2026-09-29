import { createHash, randomUUID } from "node:crypto";
import Fastify from "fastify";
import { can, type Principal } from "./access.ts";
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

export function createApp(db: Database, publicOrigin: string, recipeMode = false) {
  // Request paths can contain case identifiers; audit writes are stored separately.
  const app = Fastify({ logger: false, bodyLimit: 64 * 1024 });

  function sameOrigin(origin: string | undefined): boolean {
    return origin === publicOrigin;
  }

  async function authorized(cookie: string | undefined): Promise<Principal | null> {
    return findPrincipal(db, cookie);
  }

  app.get("/api/health", async () => ({ status: "ok" }));

  app.get("/api/session", async (request, reply) => {
    const principal = await authorized(request.headers.cookie);
    if (!principal) return reply.code(401).send({ error: "authentication_required" });
    return principal;
  });

  if (recipeMode) {
    app.post("/api/recipe/session", async (request, reply) => {
      if (!sameOrigin(request.headers.origin)) return reply.code(403).send({ error: "origin_denied" });
      const result = await db.query(`SELECT id FROM users WHERE identity_issuer = $1
        AND identity_subject = $2 AND role = 'sav_technician' AND active = true`,
      ["https://identity.example.invalid", "technicien-fictif"]);
      if (!result.rows.length) return reply.code(503).send({ error: "recipe_identity_missing" });
      const token = await issueSession(db, result.rows[0].id);
      return reply.header("Set-Cookie", sessionSetCookie(token)).send({ mode: "fictional_recipe" });
    });
  }

  app.post("/api/logout", async (request, reply) => {
    if (!sameOrigin(request.headers.origin)) return reply.code(403).send({ error: "origin_denied" });
    await revokeSession(db, request.headers.cookie);
    return reply.header("Set-Cookie", sessionClearCookie).code(204).send();
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

  return app;
}

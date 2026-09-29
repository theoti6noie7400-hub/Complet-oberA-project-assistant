import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Database } from "./db.ts";
import { findPrincipal } from "./session.ts";

const uuid = { type: "string", format: "uuid" } as const;
const params = { type: "object", required: ["id"], additionalProperties: false,
  properties: { id: uuid } } as const;
const fields = `p.id, p.kind, p.request_type, p.subject, p.message, p.public_status,
  p.created_at, p.device_id, p.linked_sav_case_id,
  o.name AS organization_name, u.identity_subject AS author_identifier,
  d.model AS device_model, d.serial AS device_serial,
  s.sav_reference AS linked_sav_reference`;
const joins = `FROM portal_requests p
  JOIN organizations o ON o.id = p.organization_id
  JOIN users u ON u.id = p.created_by
  LEFT JOIN devices d ON d.id = p.device_id
  LEFT JOIN sav_cases s ON s.id = p.linked_sav_case_id`;

export function registerPortalRequestRoutes(app: FastifyInstance, db: Database, publicOrigin: string) {
  async function staff(request: FastifyRequest, reply: FastifyReply) {
    const principal = await findPrincipal(db, request.headers.cookie);
    if (!principal) { reply.code(401).send({ error: "authentication_required" }); return null; }
    if (!["global_admin", "sav_manager", "sav_technician"].includes(principal.role)) {
      reply.code(403).send({ error: "access_denied" }); return null;
    }
    return principal;
  }

  app.get("/api/portal/requests", async (request, reply) => {
    if (!await staff(request, reply)) return reply;
    const result = await db.query(`SELECT ${fields} ${joins}
      ORDER BY p.created_at DESC, p.id DESC LIMIT 101`);
    return { requests: result.rows.slice(0, 100), has_more: result.rows.length > 100 };
  });

  app.get("/api/portal/requests/:id", { schema: { params } }, async (request, reply) => {
    if (!await staff(request, reply)) return reply;
    const result = await db.query(`SELECT ${fields} ${joins} WHERE p.id = $1`,
      [(request.params as { id: string }).id]);
    return result.rows[0] ?? reply.code(404).send({ error: "not_found" });
  });

  app.get("/api/portal/requests/:id/compatible-cases", { schema: { params } }, async (request, reply) => {
    if (!await staff(request, reply)) return reply;
    const { id } = request.params as { id: string };
    const found = await db.query(`SELECT kind, request_type, organization_id, device_id,
      linked_sav_case_id FROM portal_requests WHERE id = $1`, [id]);
    if (!found.rows.length) return reply.code(404).send({ error: "not_found" });
    const item = found.rows[0];
    if (item.kind !== "client" || item.request_type !== "sav" || !item.device_id || item.linked_sav_case_id)
      return { cases: [] };
    const cases = await db.query(`SELECT id, sav_reference FROM sav_cases
      WHERE client_organization_id = $1 AND device_id = $2
      ORDER BY created_at DESC, id DESC LIMIT 100`, [item.organization_id, item.device_id]);
    return { cases: cases.rows };
  });

  app.post("/api/portal/requests/:id/status", { schema: { params, body: {
    type: "object", required: ["status"], additionalProperties: false,
    properties: { status: { type: "string", enum: ["received", "in_progress", "closed"] } }
  } } }, async (request, reply) => {
    const principal = await staff(request, reply);
    if (!principal) return reply;
    if (request.headers.origin !== publicOrigin) return reply.code(403).send({ error: "origin_denied" });
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: string };
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const found = await client.query("SELECT public_status FROM portal_requests WHERE id = $1 FOR UPDATE", [id]);
      if (!found.rows.length) { await client.query("ROLLBACK"); return reply.code(404).send({ error: "not_found" }); }
      const previous = found.rows[0].public_status;
      if (!((previous === "received" && status === "in_progress") ||
        (previous === "in_progress" && status === "closed"))) {
        await client.query("ROLLBACK");
        return reply.code(409).send({ error: "invalid_status_transition" });
      }
      await client.query("UPDATE portal_requests SET public_status = $2 WHERE id = $1", [id, status]);
      await client.query(`INSERT INTO audit_events(actor_user_id, action, resource_kind, resource_id)
        VALUES ($1, $2, 'portal_request', $3)`, [principal.userId, `status:${previous}:${status}`, id]);
      await client.query("COMMIT");
      return { id, public_status: status };
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  });

  app.post("/api/portal/requests/:id/sav-case", { schema: { params, body: {
    type: "object", required: ["savCaseId"], additionalProperties: false,
    properties: { savCaseId: uuid }
  } } }, async (request, reply) => {
    const principal = await staff(request, reply);
    if (!principal) return reply;
    if (request.headers.origin !== publicOrigin) return reply.code(403).send({ error: "origin_denied" });
    const { id } = request.params as { id: string };
    const { savCaseId } = request.body as { savCaseId: string };
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(`SELECT kind, request_type, organization_id, device_id,
        linked_sav_case_id FROM portal_requests WHERE id = $1 FOR UPDATE`, [id]);
      if (!result.rows.length) { await client.query("ROLLBACK"); return reply.code(404).send({ error: "not_found" }); }
      const requestRecord = result.rows[0];
      if (requestRecord.kind !== "client" || requestRecord.request_type !== "sav" || !requestRecord.device_id) {
        await client.query("ROLLBACK"); return reply.code(409).send({ error: "request_not_linkable" });
      }
      if (requestRecord.linked_sav_case_id) {
        await client.query("ROLLBACK"); return reply.code(409).send({ error: "already_linked" });
      }
      // The same generic 404 covers missing, foreign-organization and mismatched-device cases.
      const compatible = await client.query(`SELECT id FROM sav_cases WHERE id = $1
        AND client_organization_id = $2 AND device_id = $3`,
      [savCaseId, requestRecord.organization_id, requestRecord.device_id]);
      if (!compatible.rows.length) { await client.query("ROLLBACK"); return reply.code(404).send({ error: "not_found" }); }
      await client.query("UPDATE portal_requests SET linked_sav_case_id = $2 WHERE id = $1", [id, savCaseId]);
      await client.query(`INSERT INTO audit_events(actor_user_id, action, resource_kind, resource_id)
        VALUES ($1, 'link_sav_case', 'portal_request', $2)`, [principal.userId, id]);
      await client.query("COMMIT");
      return { id, linked_sav_case_id: savCaseId };
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  });
}

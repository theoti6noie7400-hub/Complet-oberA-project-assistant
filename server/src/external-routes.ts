import { createHash, randomUUID } from "node:crypto";
import { readFile, realpath, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Database } from "./db.ts";
import { findPrincipal } from "./session.ts";
import type { ExternalRole } from "./external-auth.ts";

const uuid = { type: "string", format: "uuid" } as const;
const idParams = { params: { type: "object", required: ["id"], properties: { id: uuid } } } as const;
const publicRequestFields = `id, request_type, device_id, subject, message,
  CASE WHEN public_status IN ('received','in_progress','closed') THEN public_status
    ELSE 'unavailable' END AS public_status, created_at`;
type RequestInput = { submissionKey: string; requestType: "sav" | "consumables" | "general";
  deviceId?: string; subject: string; message: string };

export function registerExternalRoutes(app: FastifyInstance, db: Database, publicOrigin: string) {
  async function scope(request: FastifyRequest, reply: FastifyReply, role: ExternalRole) {
    const principal = await findPrincipal(db, request.headers.cookie);
    if (!principal) { reply.code(401).send({ error: "authentication_required" }); return null; }
    if (principal.role !== role || principal.organizationIds.length !== 1) {
      reply.code(403).send({ error: "access_denied" }); return null;
    }
    return { userId: principal.userId, organizationId: principal.organizationIds[0] };
  }

  for (const role of ["client", "reseller"] as const) {
    const base = `/api/${role}`;
    app.get(`${base}/me`, async (request, reply) => {
      const owner = await scope(request, reply, role);
      if (!owner) return reply;
      const result = await db.query("SELECT name FROM organizations WHERE id = $1 AND kind = $2",
        [owner.organizationId, role]);
      if (!result.rows.length) return reply.code(403).send({ error: "access_denied" });
      return { organization: { name: result.rows[0].name }, role };
    });

    if (role === "client") {
      app.get(`${base}/devices`, async (request, reply) => {
        const owner = await scope(request, reply, role);
        if (!owner) return reply;
        const result = await db.query(`SELECT id, model, serial FROM devices
          WHERE client_organization_id = $1 ORDER BY model, id LIMIT 100`, [owner.organizationId]);
        return { devices: result.rows };
      });
      app.get(`${base}/devices/:id`, { schema: idParams }, async (request, reply) => {
        const owner = await scope(request, reply, role);
        if (!owner) return reply;
        const result = await db.query(`SELECT id, model, serial FROM devices
          WHERE id = $1 AND client_organization_id = $2`,
        [(request.params as { id: string }).id, owner.organizationId]);
        return result.rows[0] ?? reply.code(404).send({ error: "not_found" });
      });
    }

    app.get(`${base}/requests`, async (request, reply) => {
      const owner = await scope(request, reply, role);
      if (!owner) return reply;
      const result = await db.query(`SELECT ${publicRequestFields} FROM portal_requests
        WHERE kind = $1 AND organization_id = $2 ORDER BY created_at DESC, id DESC LIMIT 100`,
      [role, owner.organizationId]);
      return { requests: result.rows };
    });
    app.get(`${base}/requests/:id`, { schema: idParams }, async (request, reply) => {
      const owner = await scope(request, reply, role);
      if (!owner) return reply;
      const result = await db.query(`SELECT ${publicRequestFields} FROM portal_requests
        WHERE id = $1 AND kind = $2 AND organization_id = $3`,
      [(request.params as { id: string }).id, role, owner.organizationId]);
      return result.rows[0] ?? reply.code(404).send({ error: "not_found" });
    });

    app.post(`${base}/requests`, { schema: { body: {
      type: "object", additionalProperties: false,
      required: ["submissionKey", "requestType", "subject", "message"],
      properties: {
        submissionKey: uuid,
        requestType: { type: "string", enum: role === "client" ? ["sav", "consumables"] : ["general", "consumables"] },
        ...(role === "client" ? { deviceId: uuid } : {}),
        subject: { type: "string", minLength: 1, maxLength: 200, pattern: "\\S" },
        message: { type: "string", minLength: 1, maxLength: 5000, pattern: "\\S" }
      }
    } } }, async (request, reply) => {
      const owner = await scope(request, reply, role);
      if (!owner) return reply;
      if (request.headers.origin !== publicOrigin) return reply.code(403).send({ error: "origin_denied" });
      const input = request.body as RequestInput;
      if (role === "client" && input.requestType === "sav" && !input.deviceId)
        return reply.code(400).send({ error: "device_required" });
      const deviceId = role === "client" ? input.deviceId ?? null : null;
      const hash = createHash("sha256").update(JSON.stringify([
        role, owner.organizationId, input.requestType, deviceId, input.subject, input.message
      ])).digest("hex");
      const client = await db.connect();
      try {
        await client.query("BEGIN");
        if (deviceId) {
          const device = await client.query(`SELECT id FROM devices
            WHERE id = $1 AND client_organization_id = $2`, [deviceId, owner.organizationId]);
          if (!device.rows.length) { await client.query("ROLLBACK"); return reply.code(404).send({ error: "not_found" }); }
        }
        const id = randomUUID();
        const result = await client.query(`INSERT INTO portal_requests
          (id, kind, organization_id, created_by, request_type, device_id, subject, message, submission_key, request_hash)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
          ON CONFLICT (created_by, submission_key) DO NOTHING RETURNING ${publicRequestFields}`,
        [id, role, owner.organizationId, owner.userId, input.requestType, deviceId,
          input.subject, input.message, input.submissionKey, hash]);
        if (!result.rows.length) {
          const prior = await client.query(`SELECT ${publicRequestFields}, request_hash FROM portal_requests
            WHERE created_by = $1 AND submission_key = $2`, [owner.userId, input.submissionKey]);
          await client.query("COMMIT");
          if (prior.rows[0]?.request_hash !== hash)
            return reply.code(409).send({ error: "submission_key_conflict" });
          const { request_hash: _hash, ...publicRequest } = prior.rows[0];
          return reply.code(200).send(publicRequest);
        }
        await client.query(`INSERT INTO audit_events (actor_user_id, action, resource_kind, resource_id)
          VALUES ($1, 'create', 'portal_request', $2)`, [owner.userId, id]);
        await client.query("COMMIT");
        return reply.code(201).send(result.rows[0]);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally { client.release(); }
    });

    app.get(`${base}/documents`, async (request, reply) => {
      const owner = await scope(request, reply, role);
      if (!owner) return reply;
      const result = await db.query(`SELECT id, title, created_at FROM documents
        WHERE organization_id = $1 AND audience = $2 ORDER BY created_at DESC, id DESC LIMIT 100`,
      [owner.organizationId, role]);
      return { documents: result.rows };
    });
    app.get(`${base}/documents/:id/content`, { schema: idParams }, async (request, reply) => {
      const owner = await scope(request, reply, role);
      if (!owner) return reply;
      const id = (request.params as { id: string }).id;
      const result = await db.query(`SELECT storage_key, mime_type FROM documents
        WHERE id = $1 AND organization_id = $2 AND audience = $3`,
      [id, owner.organizationId, role]);
      if (!result.rows.length) return reply.code(404).send({ error: "not_found" });
      const root = process.env.PRIVATE_DOCUMENT_ROOT;
      if (!root) return reply.code(503).send({ error: "documents_unavailable" });
      const key = result.rows[0].storage_key as string;
      if (!/^[A-Za-z0-9._/-]+$/.test(key) || isAbsolute(key))
        return reply.code(404).send({ error: "not_found" });
      try {
        const realRoot = await realpath(root);
        const file = await realpath(resolve(realRoot, key));
        const pathWithin = relative(realRoot, file);
        if (!pathWithin || pathWithin.startsWith("..") || isAbsolute(pathWithin))
          return reply.code(404).send({ error: "not_found" });
        const info = await stat(file);
        if (!info.isFile() || info.size > 10 * 1024 * 1024)
          return reply.code(404).send({ error: "not_found" });
        const data = await readFile(file);
        const mime = result.rows[0].mime_type === "application/pdf" ? "application/pdf" : "text/plain; charset=utf-8";
        const extension = mime === "application/pdf" ? "pdf" : "txt";
        return reply.header("Cache-Control", "no-store")
          .header("Content-Disposition", `attachment; filename="document-${id}.${extension}"`)
          .type(mime).send(data);
      } catch {
        return reply.code(404).send({ error: "not_found" });
      }
    });
  }
}

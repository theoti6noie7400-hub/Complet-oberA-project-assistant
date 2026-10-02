import { createHash, randomUUID } from "node:crypto";
import { readFile, realpath, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Database } from "./db.ts";
import { findPrincipal } from "./session.ts";
import type { ExternalRole } from "./external-auth.ts";
import { resolveDiagnosticPath, type DiagnosticPath } from "../../src/lib/diagnosticContext.ts";
import { fingerprintDiagnosticGraph } from "./diagnostic-fingerprint.ts";
import { noticeAvailable, verifiedNotice, type NoticeAsset } from "./client-notices.ts";

const uuid = { type: "string", format: "uuid" } as const;
const idParams = { params: { type: "object", required: ["id"], properties: { id: uuid } } } as const;
const publicRequestFields = `id, request_type, device_id, subject, message,
  CASE WHEN public_status IN ('received','in_progress','closed') THEN public_status
    ELSE 'unavailable' END AS public_status, created_at`;
const publicReadFields = `${publicRequestFields}, COALESCE((
  SELECT json_agg(d.device_id ORDER BY d.device_id)
  FROM portal_request_devices d WHERE d.request_id = portal_requests.id
), '[]'::json) AS device_ids`;
type RequestInput = { submissionKey: string; requestType: "sav" | "consumables" | "maintenance_quote" | "general";
  deviceId?: string; deviceIds?: string[]; subject: string; message: string;
  diagnosticContext?: DiagnosticPath };
const diagnosticGraphFingerprint = fingerprintDiagnosticGraph();

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
      const deviceFields = `d.id, d.model, d.serial, n.sha256, n.storage_key, n.size_bytes`;
      const deviceJoin = `FROM devices d LEFT JOIN client_model_notices m ON m.model = d.model
        LEFT JOIN client_notice_assets n ON n.sha256 = m.asset_sha256`;
      const publicDevice = async (row: Record<string, unknown>) => ({ id: row.id, model: row.model,
        serial: row.serial, notice_available: await noticeAvailable(process.env.PRIVATE_DOCUMENT_ROOT,
          row.storage_key ? row as unknown as NoticeAsset : null) });
      app.get(`${base}/devices`, async (request, reply) => {
        const owner = await scope(request, reply, role);
        if (!owner) return reply;
        const result = await db.query(`SELECT ${deviceFields} ${deviceJoin}
          WHERE d.client_organization_id = $1 ORDER BY d.model, d.id LIMIT 100`, [owner.organizationId]);
        return { devices: await Promise.all(result.rows.map(publicDevice)) };
      });
      app.get(`${base}/devices/:id`, { schema: idParams }, async (request, reply) => {
        const owner = await scope(request, reply, role);
        if (!owner) return reply;
        const result = await db.query(`SELECT ${deviceFields} ${deviceJoin}
          WHERE d.id = $1 AND d.client_organization_id = $2`,
        [(request.params as { id: string }).id, owner.organizationId]);
        return result.rows[0] ? publicDevice(result.rows[0]) : reply.code(404).send({ error: "not_found" });
      });
      app.get(`${base}/devices/:id/notice`, { schema: idParams }, async (request, reply) => {
        const owner = await scope(request, reply, role);
        if (!owner) return reply;
        const result = await db.query(`SELECT n.sha256, n.storage_key, n.size_bytes ${deviceJoin}
          WHERE d.id = $1 AND d.client_organization_id = $2`,
        [(request.params as { id: string }).id, owner.organizationId]);
        const asset = result.rows[0] as NoticeAsset | undefined;
        if (!asset?.storage_key) return reply.code(404).send({ error: "not_found" });
        const data = await verifiedNotice(process.env.PRIVATE_DOCUMENT_ROOT, asset);
        if (!data) return reply.code(404).send({ error: "not_found" });
        return reply.header("Cache-Control", "no-store")
          .header("Content-Disposition", 'attachment; filename="notice-obera.pdf"')
          .type("application/pdf").send(data);
      });
    }

    app.get(`${base}/requests`, async (request, reply) => {
      const owner = await scope(request, reply, role);
      if (!owner) return reply;
      const result = await db.query(`SELECT ${publicReadFields} FROM portal_requests
        WHERE kind = $1 AND organization_id = $2 ORDER BY created_at DESC, id DESC LIMIT 100`,
      [role, owner.organizationId]);
      return { requests: result.rows };
    });
    app.get(`${base}/requests/:id`, { schema: idParams }, async (request, reply) => {
      const owner = await scope(request, reply, role);
      if (!owner) return reply;
      const result = await db.query(`SELECT ${publicReadFields} FROM portal_requests
        WHERE id = $1 AND kind = $2 AND organization_id = $3`,
      [(request.params as { id: string }).id, role, owner.organizationId]);
      return result.rows[0] ?? reply.code(404).send({ error: "not_found" });
    });

    app.post(`${base}/requests`, { schema: { body: {
      type: "object", additionalProperties: false,
      required: ["submissionKey", "requestType", "subject", "message"],
      properties: {
        submissionKey: uuid,
        requestType: { type: "string", enum: role === "client" ? ["sav", "maintenance_quote"] : ["general"] },
        ...(role === "client" ? { deviceId: uuid, deviceIds: { type: "array", items: uuid, maxItems: 100, uniqueItems: true },
          diagnosticContext: { type: "object", additionalProperties: false,
            required: ["version", "productId", "steps", "result"],
            properties: {
              version: { type: "integer", enum: [1] },
              productId: { type: "string", minLength: 1, maxLength: 80 },
              result: { type: "string", enum: ["unresolved"] },
              steps: { type: "array", minItems: 1, maxItems: 30, items: {
                type: "object", additionalProperties: false, required: ["nodeId"],
                properties: { nodeId: { type: "string", minLength: 1, maxLength: 80 },
                  optionIndex: { type: "integer", minimum: 0, maximum: 30 },
                  continued: { type: "boolean", enum: [true] }, confirmed: { type: "boolean" } }
              } }
            }
          } } : {}),
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
      if ((input.requestType === "maintenance_quote" && input.deviceId) ||
          (input.requestType !== "maintenance_quote" && input.deviceIds !== undefined))
        return reply.code(400).send({ error: "invalid_device_selection" });
      if (input.diagnosticContext && input.requestType !== "sav")
        return reply.code(400).send({ error: "invalid_diagnostic_context" });
      const deviceId = role === "client" ? input.deviceId ?? null : null;
      const deviceIds = input.requestType === "maintenance_quote" ? [...(input.deviceIds ?? [])].sort() : [];
      // Preserve hashes of pre-migration submissions, including their retry semantics.
      const identity = [role, owner.organizationId, input.requestType, deviceId,
        ...(input.requestType === "maintenance_quote" ? [deviceIds] : []), input.subject, input.message,
        ...(input.diagnosticContext ? [input.diagnosticContext] : [])];
      const hash = createHash("sha256").update(JSON.stringify(identity)).digest("hex");
      const client = await db.connect();
      try {
        await client.query("BEGIN");
        let diagnosticSnapshot: object | null = null;
        if (deviceId) {
          const device = await client.query(`SELECT id, model, serial FROM devices
            WHERE id = $1 AND client_organization_id = $2`, [deviceId, owner.organizationId]);
          if (!device.rows.length) { await client.query("ROLLBACK"); return reply.code(404).send({ error: "not_found" }); }
          if (input.diagnosticContext) {
            const path = resolveDiagnosticPath(input.diagnosticContext, device.rows[0].model);
            if (!path || JSON.stringify(input.diagnosticContext).length > 12000) {
              await client.query("ROLLBACK"); return reply.code(400).send({ error: "invalid_diagnostic_context" });
            }
            diagnosticSnapshot = { version: 1, graphFingerprintVersion: 2,
              graphFingerprint: diagnosticGraphFingerprint,
              productId: input.diagnosticContext.productId,
              device: { id: deviceId, model: device.rows[0].model, serial: device.rows[0].serial },
              symptom: path.symptom, steps: path.steps, result: "unresolved", comment: input.message };
          }
        }
        if (deviceIds.length) {
          const selected = await client.query(`SELECT id FROM devices
            WHERE id = ANY($1::uuid[]) AND client_organization_id = $2`, [deviceIds, owner.organizationId]);
          if (selected.rows.length !== deviceIds.length) {
            await client.query("ROLLBACK"); return reply.code(404).send({ error: "not_found" });
          }
        }
        const id = randomUUID();
        const result = await client.query(`INSERT INTO portal_requests
          (id, kind, organization_id, created_by, request_type, device_id, subject, message, submission_key, request_hash, diagnostic_context)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
          ON CONFLICT (created_by, submission_key) DO NOTHING RETURNING id`,
        [id, role, owner.organizationId, owner.userId, input.requestType, deviceId,
          input.subject, input.message, input.submissionKey, hash,
          diagnosticSnapshot === null ? null : JSON.stringify(diagnosticSnapshot)]);
        if (!result.rows.length) {
          const prior = await client.query(`SELECT request_hash FROM portal_requests
            WHERE created_by = $1 AND submission_key = $2`, [owner.userId, input.submissionKey]);
          if (prior.rows[0]?.request_hash !== hash) {
            await client.query("ROLLBACK");
            return reply.code(409).send({ error: "submission_key_conflict" });
          }
          const existing = await client.query(`SELECT ${publicReadFields} FROM portal_requests
            WHERE created_by = $1 AND submission_key = $2`, [owner.userId, input.submissionKey]);
          await client.query("COMMIT");
          return reply.code(200).send(existing.rows[0]);
        }
        for (const selectedDeviceId of deviceIds) {
          await client.query(`INSERT INTO portal_request_devices (request_id, organization_id, device_id)
            VALUES ($1, $2, $3)`, [id, owner.organizationId, selectedDeviceId]);
        }
        await client.query(`INSERT INTO audit_events (actor_user_id, action, resource_kind, resource_id)
          VALUES ($1, 'create', 'portal_request', $2)`, [owner.userId, id]);
        const created = await client.query(`SELECT ${publicReadFields} FROM portal_requests WHERE id = $1`, [id]);
        await client.query("COMMIT");
        return reply.code(201).send(created.rows[0]);
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

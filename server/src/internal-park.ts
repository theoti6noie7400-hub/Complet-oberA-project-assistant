import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Database } from "./db.ts";
import { findPrincipal } from "./session.ts";
import { noticeAvailable, verifiedNotice, type NoticeAsset } from "./client-notices.ts";

const uuid = { type: "string", format: "uuid" } as const;
const idParams = { params: { type: "object", required: ["id"], properties: { id: uuid } } } as const;
const savRoles = new Set(["global_admin", "sav_manager", "sav_technician"]);

export function registerInternalParkRoutes(app: FastifyInstance, db: Database) {
  async function staff(request: FastifyRequest, reply: FastifyReply) {
    const principal = await findPrincipal(db, request.headers.cookie);
    if (!principal) { reply.code(401).send({ error: "authentication_required" }); return false; }
    if (!savRoles.has(principal.role)) { reply.code(403).send({ error: "access_denied" }); return false; }
    return true;
  }

  app.get("/api/sav/clients", async (request, reply) => {
    if (!await staff(request, reply)) return reply;
    const result = await db.query(`SELECT o.id, o.name, o.external_reference,
      count(d.id)::int AS device_count FROM organizations o
      LEFT JOIN devices d ON d.client_organization_id = o.id
      WHERE o.kind = 'client' GROUP BY o.id ORDER BY o.name, o.id LIMIT 100`);
    return { clients: result.rows };
  });

  app.get("/api/sav/clients/:id/devices", { schema: idParams }, async (request, reply) => {
    if (!await staff(request, reply)) return reply;
    const id = (request.params as { id: string }).id;
    const organization = await db.query("SELECT id, name FROM organizations WHERE id = $1 AND kind = 'client'", [id]);
    if (!organization.rows.length) return reply.code(404).send({ error: "not_found" });
    const result = await db.query(`SELECT d.id, d.model, d.serial, n.sha256, n.storage_key, n.size_bytes
      FROM devices d LEFT JOIN client_model_notices m ON m.model = d.model
      LEFT JOIN client_notice_assets n ON n.sha256 = m.asset_sha256
      WHERE d.client_organization_id = $1 ORDER BY d.model, d.serial, d.id LIMIT 100`, [id]);
    const devices = await Promise.all(result.rows.map(async row => ({
      id: row.id, model: row.model, serial: row.serial,
      notice_available: await noticeAvailable(process.env.PRIVATE_DOCUMENT_ROOT,
        row.storage_key ? row as NoticeAsset : null)
    })));
    return { organization: organization.rows[0], devices };
  });

  app.get("/api/sav/devices/:id/notice", { schema: idParams }, async (request, reply) => {
    if (!await staff(request, reply)) return reply;
    const result = await db.query(`SELECT n.sha256, n.storage_key, n.size_bytes
      FROM devices d JOIN organizations o ON o.id = d.client_organization_id AND o.kind = 'client'
      LEFT JOIN client_model_notices m ON m.model = d.model
      LEFT JOIN client_notice_assets n ON n.sha256 = m.asset_sha256 WHERE d.id = $1`,
    [(request.params as { id: string }).id]);
    const asset = result.rows[0] as NoticeAsset | undefined;
    if (!asset?.storage_key) return reply.code(404).send({ error: "not_found" });
    const data = await verifiedNotice(process.env.PRIVATE_DOCUMENT_ROOT, asset);
    if (!data) return reply.code(404).send({ error: "not_found" });
    return reply.header("Cache-Control", "no-store")
      .header("Content-Disposition", 'attachment; filename="notice-obera.pdf"')
      .type("application/pdf").send(data);
  });
}

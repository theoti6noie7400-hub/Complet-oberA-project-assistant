import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { createApp } from "./app.ts";
import { loadBetaAccounts } from "./beta-auth.ts";
import { openDatabase } from "./db.ts";
import { issueSession } from "./session.ts";

const integration = process.env.EXTERNAL_TEST_DATABASE_URL ? test : test.skip;
const origin = "https://portail-demo.example.invalid";
const clientA = "a1000000-0000-4000-8000-000000000001";
const historical = "f1000000-0000-4000-8000-000000000002";

integration("V1 PostgreSQL: internal park, private notice and historical consumables; external access closed", async () => {
  assert.equal(new URL(process.env.EXTERNAL_TEST_DATABASE_URL!).pathname, "/obera_beta_demo");
  process.env.DATABASE_URL = process.env.EXTERNAL_TEST_DATABASE_URL;
  const db = openDatabase();
  const accounts = loadBetaAccounts(JSON.stringify([
    { identifier: "DEMO-V1-MANAGER", pin: "9011", role: "sav_manager" },
    { identifier: "DEMO-V1-TECH", pin: "9012", role: "sav_technician" },
    { identifier: "DEMO-V1-COMMERCIAL", pin: "9013", role: "commercial" }
  ]));
  const app = createApp(db, origin, accounts);
  const deviceId = randomUUID();
  const model = "DEMO V1 TEST MODEL";
  const pdf = Buffer.from("%PDF-1.4\n% DEMO NOTICE V1 AUTOMATED TEST ONLY\n%%EOF\n");
  const sha = createHash("sha256").update(pdf).digest("hex");
  const root = process.env.PRIVATE_DOCUMENT_ROOT!;
  const file = join(root, "client-notices", `${sha}.pdf`);
  const send = (method: "GET" | "POST", url: string, cookie?: string, payload?: object) =>
    app.inject({ method, url, headers: { ...(cookie ? { cookie } : {}), ...(method === "POST" ? { origin } : {}) }, payload });
  const login = async (identifier: string, pin: string) => {
    const result = await send("POST", "/api/login", undefined, { identifier, pin });
    assert.equal(result.statusCode, 200, result.body);
    return (result.headers["set-cookie"] as string).split(";", 1)[0];
  };
  try {
    const legacy = await issueSession(db, "c1000000-0000-4000-8000-000000000001");
    const oldCookie = `obera_session=${legacy}`;
    assert.equal((await send("GET", "/api/session", oldCookie)).statusCode, 401);
    assert.equal((await send("GET", "/api/client/devices", oldCookie)).statusCode, 404);
    assert.equal((await send("GET", "/api/sav/clients", oldCookie)).statusCode, 403);
    assert.equal((await send("POST", "/api/client/login", undefined,
      { identifier: "DEMO-CLIENT-A", pin: "1234" })).statusCode, 410);
    assert.equal((await send("GET", "/api/sav/clients")).statusCode, 401);
    const manager = await login("DEMO-V1-MANAGER", "9011");
    const technician = await login("DEMO-V1-TECH", "9012");
    const commercial = await login("DEMO-V1-COMMERCIAL", "9013");
    const before = (await db.query("SELECT count(*)::int AS n FROM portal_requests WHERE request_type='consumables'")).rows[0].n;
    assert.ok(before >= 2, "historical Client and reseller requests exist");
    await db.query("INSERT INTO devices(id,client_organization_id,model,serial) VALUES($1,$2,$3,'DEMO-SN-V1')", [deviceId, clientA, model]);
    await mkdir(join(root, "client-notices"), { recursive: true });
    await writeFile(file, pdf);
    await db.query(`INSERT INTO client_notice_assets(sha256,storage_key,source_name,size_bytes)
      VALUES($1,$2,'DEMO-V1-test.pdf',$3) ON CONFLICT DO NOTHING`,
    [sha, `client-notices/${sha}.pdf`, pdf.length]);
    await db.query("INSERT INTO client_model_notices(model,asset_sha256) VALUES($1,$2)", [model, sha]);
    for (const staff of [manager, technician, commercial]) {
      const listing = await send("GET", "/api/sav/clients", staff);
      assert.equal(listing.statusCode, 200);
      assert.deepEqual(listing.json().clients.map((item: { name: string }) => item.name).sort(),
        ["CLIENT DEMO ALPHA", "CLIENT DEMO BETA"]);
      const park = await send("GET", `/api/sav/clients/${clientA}/devices`, staff);
      assert.equal(park.statusCode, 200);
      assert.deepEqual(park.json().devices.find((item: { id: string }) => item.id === deviceId),
        { id: deviceId, model, serial: "DEMO-SN-V1", notice_available: true });
      assert.equal((await send("GET", `/api/sav/clients/${randomUUID()}/devices`, staff)).statusCode, 404);
      const scoped = await send("GET", `/api/sav/clients/${clientA}/devices/${deviceId}`, staff);
      assert.equal(scoped.statusCode, 200);
      assert.deepEqual(scoped.json().device, { id: deviceId, model, serial: "DEMO-SN-V1", notice_available: true });
      assert.equal((await send("GET", `/api/sav/clients/${randomUUID()}/devices/${deviceId}`, staff)).statusCode, 404);
      assert.equal((await send("GET", `/api/sav/clients/${clientA}/devices/${randomUUID()}`, staff)).statusCode, 404);
      const notice = await send("GET", `/api/sav/devices/${deviceId}/notice`, staff);
      assert.equal(notice.statusCode, 200);
      assert.equal(notice.headers["content-type"], "application/pdf");
      assert.deepEqual(notice.rawPayload, pdf);
      if (staff !== commercial) {
        const archive = await send("GET", `/api/portal/requests/${historical}`, staff);
        assert.equal(archive.statusCode, 200);
        assert.equal(archive.json().request_type, "consumables");
      }
      assert.equal((await send("GET", `/api/sav/devices/${randomUUID()}/notice`, staff)).statusCode, 404);
      assert.equal((await send("GET", "/api/sav/cases", staff)).statusCode, staff === commercial ? 403 : 200);
    }
    assert.equal((await send("GET", `/api/portal/requests/${historical}`, commercial)).statusCode, 403);
    assert.equal((await send("POST", `/api/portal/requests/${historical}/status`, commercial,
      { status: "in_progress" })).statusCode, 403);
    assert.equal((await send("POST", `/api/portal/requests/${historical}/sav-case`, commercial,
      { savCaseId: randomUUID() })).statusCode, 403);
    assert.equal((await send("GET", "/api/sav/contracts", commercial)).statusCode, 403);
    assert.equal((await send("GET", "/api/client/devices", commercial)).statusCode, 404);
    const actor = (await send("GET", "/api/session", commercial)).json().userId;
    const logs = await db.query(`SELECT action,resource_kind,resource_id FROM audit_events
      WHERE actor_user_id=$1 ORDER BY occurred_at`, [actor]);
    assert.ok(logs.rows.some(row => row.action === "client_park_view:commercial" && row.resource_id === clientA));
    assert.ok(logs.rows.some(row => row.action === "client_device_view:commercial" && row.resource_id === deviceId));
    assert.ok(logs.rows.some(row => row.action === "client_notice_download:commercial" && row.resource_id === deviceId));
    assert.equal((await send("GET", `/api/sav/devices/${deviceId}/notice`, oldCookie)).statusCode, 403);
    assert.equal((await send("POST", "/api/client/requests", oldCookie,
      { requestType: "consumables" })).statusCode, 404);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM portal_requests WHERE request_type='consumables'")).rows[0].n, before);
  } finally {
    await db.query("DELETE FROM client_model_notices WHERE model = $1", [model]);
    await db.query("DELETE FROM devices WHERE id = $1", [deviceId]);
    await db.query("DELETE FROM client_notice_assets WHERE sha256 = $1 AND source_name = 'DEMO-V1-test.pdf'", [sha]);
    await app.close(); await db.end();
    await rm(file, { force: true });
  }
});

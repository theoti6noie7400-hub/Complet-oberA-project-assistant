import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { createApp } from "./app.ts";
import { loadBetaAccounts } from "./beta-auth.ts";
import { loadExternalAccounts } from "./external-auth.ts";
import { openDatabase } from "./db.ts";
import { fingerprintDiagnosticGraph } from "./diagnostic-fingerprint.ts";

const integration = process.env.EXTERNAL_TEST_DATABASE_URL ? test : test.skip;
const origin = "https://portail-demo.example.invalid";
const organization = {
  clientA: "a1000000-0000-4000-8000-000000000001",
  clientB: "a1000000-0000-4000-8000-000000000002",
  resellerA: "b1000000-0000-4000-8000-000000000001",
  resellerB: "b1000000-0000-4000-8000-000000000002"
};
const deviceA = "e1000000-0000-4000-8000-000000000001";
const deviceB = "e1000000-0000-4000-8000-000000000003";
const requestB = "f1000000-0000-4000-8000-000000000002";
const requestResellerB = "f1000000-0000-4000-8000-000000000004";
const documentB = "a2000000-0000-4000-8000-000000000002";
const documentResellerB = "b2000000-0000-4000-8000-000000000002";

integration("PostgreSQL external isolation, projections, creation, sessions and documents", async () => {
  assert.equal(new URL(process.env.EXTERNAL_TEST_DATABASE_URL!).pathname, "/obera_beta_demo");
  process.env.DATABASE_URL = process.env.EXTERNAL_TEST_DATABASE_URL;
  const db = openDatabase();
  const accounts = loadExternalAccounts(JSON.stringify([
    { identifier: "DEMO-CLIENT-A", pin: "1234", role: "client", organizationId: organization.clientA },
    { identifier: "DEMO-CLIENT-B", pin: "8022", role: "client", organizationId: organization.clientB },
    { identifier: "DEMO-CLIENT-A2", pin: "8033", role: "client", organizationId: organization.clientA },
    { identifier: "DEMO-RESELLER-A", pin: "8044", role: "reseller", organizationId: organization.resellerA },
    { identifier: "DEMO-RESELLER-B", pin: "8055", role: "reseller", organizationId: organization.resellerB },
    { identifier: "DEMO-NO-ORG", pin: "8066", role: "client", organizationId: randomUUID() },
    { identifier: "DEMO-WRONG-KIND", pin: "8077", role: "client", organizationId: organization.resellerA }
  ]));
  const app = createApp(db, origin, loadBetaAccounts(JSON.stringify([
    { identifier: "DEMO-STAFF", pin: "1789", role: "global_admin" }
  ])), accounts);
  const send = (method: "GET" | "POST", url: string, cookie?: string, payload?: object) =>
    app.inject({ method, url, headers: { ...(cookie ? { cookie } : {}), ...(method === "POST" ? { origin } : {}) }, payload });
  const login = async (realm: "client" | "", identifier: string, pin: string) => {
    const url = realm ? `/api/${realm}/login` : "/api/login";
    const response = await send("POST", url, undefined, { identifier, pin });
    assert.equal(response.statusCode, 200, identifier);
    return (response.headers["set-cookie"] as string).split(";", 1)[0];
  };
  try {
    const orgCounts = await db.query("SELECT kind, count(*)::int AS count FROM organizations GROUP BY kind ORDER BY kind");
    assert.deepEqual(orgCounts.rows, [{ kind: "client", count: 2 }, { kind: "reseller", count: 2 }]);
    assert.equal((await send("GET", "/api/client/devices")).statusCode, 401);
    assert.equal((await send("POST", "/api/client/login", undefined,
      { identifier: "DEMO-CLIENT-A", pin: "0000" })).statusCode, 401);
    assert.equal((await send("POST", "/api/client/login", undefined,
      { identifier: "DEMO-RESELLER-A", pin: "8044" })).statusCode, 401);
    assert.equal((await send("POST", "/api/client/login", undefined,
      { identifier: "DEMO-NO-ORG", pin: "8066" })).statusCode, 401);
    assert.equal((await send("POST", "/api/client/login", undefined,
      { identifier: "DEMO-WRONG-KIND", pin: "8077" })).statusCode, 401);
    assert.equal((await db.query("SELECT count(*) AS n FROM users WHERE identity_subject IN ('DEMO-NO-ORG','DEMO-WRONG-KIND')")).rows[0].n,"0");
    const a = await login("client", "DEMO-CLIENT-A", "1234");
    const b = await login("client", "DEMO-CLIENT-B", "8022");
    const a2 = await login("client", "DEMO-CLIENT-A2", "8033");
    assert.equal((await send("POST", "/api/reseller/login", undefined,
      { identifier: "DEMO-RESELLER-A", pin: "8044" })).statusCode, 410);
    assert.equal((await send("GET", "/api/reseller/requests")).statusCode, 401);
    const staff = await login("", "DEMO-STAFF", "1789");
    assert.equal((await send("GET", "/api/sav/cases", a)).statusCode, 403);
    assert.equal((await send("GET", "/api/sav/contracts", a)).statusCode, 403);
    assert.equal((await send("GET", "/api/client/devices", staff)).statusCode, 403);
    assert.equal((await send("GET", "/api/reseller/requests", a)).statusCode, 403);
    // Test-only PDF, clearly marked DEMO, never committed as an OberA notice.
    const demoPdf = Buffer.from("%PDF-1.4\n% DEMO NOTICE - AUTOMATED TEST ONLY\n%%EOF\n");
    const digest = createHash("sha256").update(demoPdf).digest("hex");
    const privateRoot = process.env.PRIVATE_DOCUMENT_ROOT!;
    await mkdir(join(privateRoot, "client-notices"), { recursive: true });
    await writeFile(join(privateRoot, "client-notices", `${digest}.pdf`), demoPdf);
    await db.query(`INSERT INTO client_notice_assets(sha256,storage_key,source_name,size_bytes)
      VALUES($1,$2,'DEMO-notice.pdf',$3) ON CONFLICT DO NOTHING`,
    [digest, `client-notices/${digest}.pdf`, demoPdf.length]);
    await db.query(`INSERT INTO client_model_notices(model,asset_sha256)
      VALUES('IC 22',$1) ON CONFLICT DO NOTHING`, [digest]);
    const ownDevices = await send("GET", "/api/client/devices", a);
    assert.equal(ownDevices.statusCode, 200);
    assert.deepEqual(ownDevices.json().devices.map((item: { id: string }) => item.id).sort(),
      [deviceA, "e1000000-0000-4000-8000-000000000002"]);
    assert.deepEqual(Object.keys(ownDevices.json().devices[0]).sort(), ["id","model","notice_available","serial"]);
    assert.equal(ownDevices.json().devices.find((item: { model: string }) => item.model === "IC 22").notice_available, true);
    assert.equal(ownDevices.json().devices.find((item: { model: string }) => item.model === "DUSTOMAT 4-24").notice_available, false);
    assert.equal((await send("GET", "/api/client/devices", b)).json().devices
      .some((item: { model: string }) => item.model === "IC 22"), false);
    assert.equal((await send("GET", `/api/client/devices/${deviceA}`, b)).statusCode, 404);
    assert.equal((await send("GET", `/api/client/devices/${deviceA}/notice`)).statusCode, 401);
    assert.equal((await send("GET", `/api/client/devices/${deviceA}/notice`, b)).statusCode, 404);
    const notice = await send("GET", `/api/client/devices/${deviceA}/notice`, a);
    assert.equal(notice.statusCode, 200);
    assert.equal(notice.headers["content-type"], "application/pdf");
    assert.equal(notice.headers["cache-control"], "no-store");
    assert.equal(notice.rawPayload.toString(), demoPdf.toString());
    assert.equal((await send("GET", "/api/client/devices/e1000000-0000-4000-8000-000000000002/notice", a)).statusCode, 404);
    assert.equal((await send("GET", `/api/client/devices/${deviceA}/notice`, staff)).statusCode, 403);
    assert.equal((await send("GET", "/api/client/devices/00000000-0000-4000-8000-000000000000/notice", a)).statusCode, 404);
    assert.equal((await send("GET", `/api/client/devices/${deviceB}`, a)).statusCode, 404);
    assert.equal((await send("GET", `/api/client/requests/${requestB}`, a)).statusCode, 404);
    assert.equal((await send("GET", `/api/reseller/requests/${requestResellerB}`)).statusCode, 401);
    assert.equal((await send("GET", `/api/client/documents/${documentB}/content`, a)).statusCode, 404);
    assert.equal((await send("GET", `/api/reseller/documents/${documentResellerB}/content`)).statusCode, 401);
    assert.equal(Number((await db.query("SELECT count(*) AS n FROM documents WHERE audience='reseller'")).rows[0].n) >= 2, true);
    assert.equal((await send("GET", "/api/client/documents/a2000000-0000-4000-8000-000000000003/content", a)).statusCode, 404);
    assert.equal((await send("GET", "/api/client/devices/00000000-0000-4000-8000-000000000000", a)).statusCode, 404);
    const docs = await send("GET", "/api/client/documents", a);
    assert.equal(docs.json().documents.length, 1);
    assert.deepEqual(Object.keys(docs.json().documents[0]).sort(), ["created_at","id","title"]);
    const download = await send("GET", "/api/client/documents/a2000000-0000-4000-8000-000000000001/content", a);
    assert.equal(download.statusCode, 200);
    assert.match(download.body,/FICTIF/);
    const payload = { submissionKey: randomUUID(), requestType: "sav", deviceId: deviceA,
      subject: "DEMO nouvelle demande", message: "PROBLEME DEMO UNIQUE" };
    const auditBefore = Number((await db.query("SELECT count(*) AS n FROM audit_events WHERE resource_kind='portal_request'")).rows[0].n);
    const created = await send("POST", "/api/client/requests", a, payload);
    assert.equal(created.statusCode, 201);
    assert.deepEqual(Object.keys(created.json()).sort(),
      ["created_at","device_id","device_ids","id","message","public_status","request_type","subject"]);
    assert.deepEqual(created.json().device_ids, []);
    assert.equal((await send("POST", "/api/client/requests", a, payload)).statusCode, 200);
    assert.equal((await send("POST", "/api/client/requests", a,
      { ...payload, message: "DIFFERENT" })).statusCode, 409);
    const createdId = created.json().id;
    assert.equal((await send("GET", `/api/client/requests/${createdId}`, a2)).statusCode, 200);
    assert.equal((await send("GET", `/api/client/requests/${createdId}`, b)).statusCode, 404);
    const casesBeforeDiagnostic = (await db.query("SELECT count(*)::int AS n FROM sav_cases")).rows[0].n;
    const diagnosticPayload = { submissionKey: randomUUID(), requestType: "sav", deviceId: deviceA,
      subject: "DEMO diagnostic transmis", message: "DEMO commentaire final",
      diagnosticContext: { version: 1, productId: "ic22", result: "unresolved", steps: [
        { nodeId: "start", optionIndex: 1 }, { nodeId: "no-power", optionIndex: 1 },
        { nodeId: "power-check-advice", confirmed: true }
      ] } };
    const diagnosticRequest = await send("POST", "/api/client/requests", a, diagnosticPayload);
    assert.equal(diagnosticRequest.statusCode, 201, diagnosticRequest.body);
    const diagnosticId = diagnosticRequest.json().id as string;
    assert.equal((await send("POST", "/api/client/requests", a, diagnosticPayload)).statusCode, 200);
    assert.equal((await send("POST", "/api/client/requests", a, {
      ...diagnosticPayload, diagnosticContext: { ...diagnosticPayload.diagnosticContext,
        steps: [{ nodeId: "start", optionIndex: 3 }, { nodeId: "contact-sav-general" }] }
    })).statusCode, 409);
    assert.equal((await send("GET", `/api/client/requests/${diagnosticId}`, b)).statusCode, 404);
    const staffDiagnostic = (await send("GET", `/api/portal/requests/${diagnosticId}`, staff)).json();
    assert.equal(staffDiagnostic.diagnostic_context.device.serial, "DEMO-SN-A-001");
    assert.equal(staffDiagnostic.diagnostic_context.symptom, "L'appareil ne s'allume pas");
    assert.equal(staffDiagnostic.diagnostic_context.steps[2].clientConfirmed, true);
    assert.equal(staffDiagnostic.diagnostic_context.result, "unresolved");
    assert.equal(staffDiagnostic.diagnostic_context.graphFingerprintVersion, 2);
    assert.equal(staffDiagnostic.diagnostic_context.graphFingerprint, fingerprintDiagnosticGraph());
    assert.equal(staffDiagnostic.diagnostic_context.comment, "DEMO commentaire final");
    assert.equal(Object.hasOwn(staffDiagnostic.diagnostic_context, "cause"), false);
    assert.equal(Object.hasOwn(staffDiagnostic.diagnostic_context, "sav_action"), false);
    assert.equal((await send("GET", `/api/client/requests/${diagnosticId}`, a2)).json().diagnostic_context, undefined);
    assert.equal((await send("GET", `/api/client/requests/${diagnosticId}`, a2)).json().cause, undefined);
    assert.equal((await send("GET", `/api/client/requests/${diagnosticId}`, a2)).json().sav_action, undefined);
    assert.equal((await send("GET", "/api/portal/requests/f1000000-0000-4000-8000-000000000001", staff))
      .json().diagnostic_context, null);
    assert.equal((await send("POST", "/api/client/requests", a, { ...diagnosticPayload,
      submissionKey: randomUUID(), diagnosticContext: { ...diagnosticPayload.diagnosticContext,
        steps: [{ nodeId: "start", optionIndex: 1 }, { nodeId: "contact-sav-general" }] }
    })).statusCode, 400);
    assert.equal((await send("POST", "/api/client/requests", a, { ...diagnosticPayload,
      submissionKey: randomUUID(), deviceId: deviceB })).statusCode, 404);
    assert.equal((await send("POST", "/api/client/requests", b, { ...diagnosticPayload,
      submissionKey: randomUUID() })).statusCode, 404);
    assert.equal((await send("POST", "/api/client/requests", a, { ...diagnosticPayload,
      submissionKey: randomUUID(), diagnosticContext: { ...diagnosticPayload.diagnosticContext,
        productId: "ic12" } })).statusCode, 400);
    assert.equal((await send("POST", "/api/client/requests", a, { ...diagnosticPayload,
      submissionKey: randomUUID(), requestType: "consumables" })).statusCode, 400);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM audit_events WHERE resource_kind='portal_request' AND resource_id=$1",
      [diagnosticId])).rows[0].n, 1);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM portal_requests WHERE id=$1", [diagnosticId])).rows[0].n, 1);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM sav_cases")).rows[0].n, casesBeforeDiagnostic);
    assert.equal((await send("POST", "/api/client/requests", a,
      { ...payload, submissionKey: randomUUID(), deviceId: deviceB })).statusCode, 404);
    const rejectedOrigin = await app.inject({ method: "POST", url: "/api/client/requests",
      headers: { cookie: a, origin: "https://other.example.invalid" }, payload: { ...payload, submissionKey: randomUUID() } });
    assert.equal(rejectedOrigin.statusCode, 403);
    assert.equal(Number((await db.query("SELECT count(*) AS n FROM audit_events WHERE resource_kind='portal_request'")).rows[0].n),auditBefore+2);
    const clientConsumables = await send("POST", "/api/client/requests", a,
      { submissionKey: randomUUID(), requestType: "consumables", subject: "DEMO sacs", message: "DEMO quantité" });
    assert.equal(clientConsumables.statusCode, 201);
    const casesBefore = (await db.query("SELECT count(*)::int AS n FROM sav_cases")).rows[0].n;
    const contractsBefore = (await db.query("SELECT count(*)::int AS n FROM contracts")).rows[0].n;
    const auditMaintenanceBefore = Number((await db.query("SELECT count(*)::int AS n FROM audit_events WHERE resource_kind='portal_request'")).rows[0].n);
    const otherOwnDevice = "e1000000-0000-4000-8000-000000000002";
    for (const deviceIds of [[], [deviceA], [otherOwnDevice, deviceA]]) {
      const submissionKey = randomUUID();
      const quote = { submissionKey, requestType: "maintenance_quote", deviceIds,
        subject: "DEMO devis maintenance", message: "DEMO étude demandée" };
      const response = await send("POST", "/api/client/requests", a, quote);
      assert.equal(response.statusCode, 201);
      assert.equal(response.json().request_type, "maintenance_quote");
      assert.equal(response.json().device_id, null);
      assert.deepEqual(response.json().device_ids, [...deviceIds].sort());
      assert.deepEqual((await send("GET", `/api/client/requests/${response.json().id}`, a2)).json().device_ids,
        [...deviceIds].sort());
      assert.equal((await send("GET", `/api/client/requests/${response.json().id}`, b)).statusCode, 404);
      assert.equal((await send("POST", "/api/client/requests", a,
        { ...quote, deviceIds: [...deviceIds].reverse() })).statusCode, 200);
      assert.equal((await send("POST", "/api/client/requests", a,
        { ...quote, message: "DEMO autre motif" })).statusCode, 409);
    }
    assert.equal((await send("POST", "/api/client/requests", a, {
      submissionKey: randomUUID(), requestType: "maintenance_quote", deviceIds: [deviceA, deviceB],
      subject: "DEMO croisé", message: "DEMO interdit" })).statusCode, 404);
    assert.equal((await send("POST", "/api/client/requests", a, {
      submissionKey: randomUUID(), requestType: "maintenance_quote", deviceIds: [deviceA, deviceA],
      subject: "DEMO doublon", message: "DEMO interdit" })).statusCode, 400);
    assert.equal((await send("POST", "/api/client/requests", a, {
      submissionKey: randomUUID(), requestType: "maintenance_quote", deviceId: deviceA,
      subject: "DEMO mauvais champ", message: "DEMO interdit" })).statusCode, 400);
    assert.equal((await send("POST", "/api/client/requests", a, {
      submissionKey: randomUUID(), requestType: "sav", deviceId: deviceA, deviceIds: [],
      subject: "DEMO mauvais champ", message: "DEMO interdit" })).statusCode, 400);
    assert.equal((await send("POST", "/api/reseller/requests", undefined, {
      submissionKey: randomUUID(), requestType: "maintenance_quote",
      subject: "DEMO interdit", message: "DEMO interdit" })).statusCode, 400);
    assert.equal((await send("POST", "/api/reseller/requests", undefined, {
      submissionKey: randomUUID(), requestType: "consumables",
      subject: "DEMO refus sans session", message: "DEMO interdit" })).statusCode, 401);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM sav_cases")).rows[0].n, casesBefore);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM contracts")).rows[0].n, contractsBefore);
    assert.equal(Number((await db.query("SELECT count(*)::int AS n FROM audit_events WHERE resource_kind='portal_request'")).rows[0].n),auditMaintenanceBefore+3);
    const resellerCreated = await send("POST", "/api/reseller/requests", undefined,
      { submissionKey: randomUUID(), requestType: "consumables", subject: "DEMO filtre", message: "DEMO quantité" });
    assert.equal(resellerCreated.statusCode, 401);
    assert.equal(Number((await db.query("SELECT count(*) AS n FROM portal_requests WHERE kind='reseller'")).rows[0].n) >= 2, true);
    const tokenHash = createHash("sha256").update(a.split("=")[1]).digest("hex");
    await db.query("UPDATE sessions SET expires_at = now() - interval '1 second' WHERE token_hash = $1", [tokenHash]);
    assert.equal((await send("GET", "/api/client/requests", a)).statusCode, 401);
    assert.equal((await send("GET", "/api/client/requests", a2)).statusCode, 200);
    assert.equal((await send("POST", "/api/logout", b)).statusCode, 204);
    assert.equal((await send("GET", "/api/client/requests", b)).statusCode, 401);
    // A malformed external identity with two organizations cannot keep its existing session.
    const userA2 = (await db.query(`SELECT id FROM users WHERE identity_subject='DEMO-CLIENT-A2'
      AND identity_issuer='urn:obera:beta:external'`)).rows[0].id;
    await db.query("INSERT INTO user_organizations(user_id,organization_id) VALUES ($1,$2)", [userA2, organization.clientB]);
    assert.equal((await send("GET", "/api/client/requests", a2)).statusCode, 401);
    assert.equal((await send("POST", "/api/client/login", undefined,
      { identifier: "DEMO-CLIENT-A2", pin: "8033" })).statusCode, 401);
    await db.query("DELETE FROM user_organizations WHERE user_id=$1 AND organization_id=$2", [userA2, organization.clientB]);
  } finally { await app.close(); await db.end(); }
});

import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { test } from "node:test";
import { createApp } from "./app.ts";
import { loadBetaAccounts } from "./beta-auth.ts";
import { loadExternalAccounts } from "./external-auth.ts";
import { openDatabase } from "./db.ts";

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
    { identifier: "DEMO-CLIENT-A", pin: "8011", role: "client", organizationId: organization.clientA },
    { identifier: "DEMO-CLIENT-B", pin: "8022", role: "client", organizationId: organization.clientB },
    { identifier: "DEMO-CLIENT-A2", pin: "8033", role: "client", organizationId: organization.clientA },
    { identifier: "DEMO-RESELLER-A", pin: "8044", role: "reseller", organizationId: organization.resellerA },
    { identifier: "DEMO-RESELLER-B", pin: "8055", role: "reseller", organizationId: organization.resellerB },
    { identifier: "DEMO-NO-ORG", pin: "8066", role: "client", organizationId: randomUUID() },
    { identifier: "DEMO-WRONG-KIND", pin: "8077", role: "client", organizationId: organization.resellerA }
  ]));
  const app = createApp(db, origin, loadBetaAccounts(JSON.stringify([
    { identifier: "DEMO-STAFF", pin: "8088", role: "sav_technician" }
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
    const a = await login("client", "DEMO-CLIENT-A", "8011");
    const b = await login("client", "DEMO-CLIENT-B", "8022");
    const a2 = await login("client", "DEMO-CLIENT-A2", "8033");
    assert.equal((await send("POST", "/api/reseller/login", undefined,
      { identifier: "DEMO-RESELLER-A", pin: "8044" })).statusCode, 410);
    assert.equal((await send("GET", "/api/reseller/requests")).statusCode, 401);
    const staff = await login("", "DEMO-STAFF", "8088");
    assert.equal((await send("GET", "/api/sav/cases", a)).statusCode, 403);
    assert.equal((await send("GET", "/api/sav/contracts", a)).statusCode, 403);
    assert.equal((await send("GET", "/api/client/devices", staff)).statusCode, 403);
    assert.equal((await send("GET", "/api/reseller/requests", a)).statusCode, 403);
    const ownDevices = await send("GET", "/api/client/devices", a);
    assert.equal(ownDevices.statusCode, 200);
    assert.deepEqual(ownDevices.json().devices.map((item: { id: string }) => item.id).sort(),
      [deviceA, "e1000000-0000-4000-8000-000000000002"]);
    assert.deepEqual(Object.keys(ownDevices.json().devices[0]).sort(), ["id","model","serial"]);
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
    const diagnosticPayload = { submissionKey: randomUUID(), requestType: "sav", deviceId: deviceA,
      subject: "DEMO diagnostic transmis", message: "DEMO commentaire final",
      diagnosticContext: { version: 1, productId: "ic12", result: "unresolved", steps: [
        { nodeId: "start", optionIndex: 1 }, { nodeId: "no-power", optionIndex: 1 },
        { nodeId: "power-check-advice", confirmed: true }
      ] } };
    const diagnosticRequest = await send("POST", "/api/client/requests", a, diagnosticPayload);
    assert.equal(diagnosticRequest.statusCode, 201, diagnosticRequest.body);
    const diagnosticId = diagnosticRequest.json().id as string;
    assert.equal((await send("POST", "/api/client/requests", a, diagnosticPayload)).statusCode, 200);
    assert.equal((await send("GET", `/api/client/requests/${diagnosticId}`, b)).statusCode, 404);
    const staffDiagnostic = (await send("GET", `/api/portal/requests/${diagnosticId}`, staff)).json();
    assert.equal(staffDiagnostic.diagnostic_context.device.serial, "DEMO-SN-A-001");
    assert.equal(staffDiagnostic.diagnostic_context.symptom, "L'appareil ne s'allume pas");
    assert.equal(staffDiagnostic.diagnostic_context.steps[2].clientConfirmed, true);
    assert.equal(staffDiagnostic.diagnostic_context.result, "unresolved");
    assert.equal((await send("GET", `/api/client/requests/${diagnosticId}`, a2)).json().diagnostic_context, undefined);
    assert.equal((await send("POST", "/api/client/requests", a, { ...diagnosticPayload,
      submissionKey: randomUUID(), diagnosticContext: { ...diagnosticPayload.diagnosticContext,
        steps: [{ nodeId: "start", optionIndex: 1 }, { nodeId: "contact-sav-general" }] }
    })).statusCode, 400);
    assert.equal((await send("POST", "/api/client/requests", a, { ...diagnosticPayload,
      submissionKey: randomUUID(), deviceId: deviceB })).statusCode, 404);
    assert.equal((await send("POST", "/api/client/requests", a, { ...diagnosticPayload,
      submissionKey: randomUUID(), requestType: "consumables" })).statusCode, 400);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM audit_events WHERE resource_kind='portal_request' AND resource_id=$1",
      [diagnosticId])).rows[0].n, 1);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM portal_requests WHERE id=$1", [diagnosticId])).rows[0].n, 1);
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
      subject: "DEMO interdit", message: "DEMO interdit" })).statusCode, 401);
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

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { createApp } from "./app.ts";
import { loadBetaAccounts } from "./beta-auth.ts";
import { loadExternalAccounts } from "./external-auth.ts";
import { openDatabase } from "./db.ts";

const integration = process.env.EXTERNAL_TEST_DATABASE_URL ? test : test.skip;
const origin = "https://portail-demo.example.invalid";
const clientA = "a1000000-0000-4000-8000-000000000001";
const clientB = "a1000000-0000-4000-8000-000000000002";
const resellerA = "b1000000-0000-4000-8000-000000000001";
const resellerB = "b1000000-0000-4000-8000-000000000002";
const deviceA = "e1000000-0000-4000-8000-000000000001";
const deviceB = "e1000000-0000-4000-8000-000000000003";

integration("DEMO Client/Revendeur → file SAV → statut public et rattachement isolé", async () => {
  assert.equal(new URL(process.env.EXTERNAL_TEST_DATABASE_URL!).pathname, "/obera_beta_demo");
  process.env.DATABASE_URL = process.env.EXTERNAL_TEST_DATABASE_URL;
  const db = openDatabase();
  const roles = ["global_admin", "sav_manager", "sav_technician"] as const;
  const accounts = loadBetaAccounts(JSON.stringify(roles.map((role, i) => ({
    identifier: `DEMO-INTERNAL-${role.toUpperCase()}`, pin: `90${String(i).padStart(2, "0")}`, role
  }))));
  const external = loadExternalAccounts(JSON.stringify([
    { identifier: "DEMO-PORTAL-CLIENT-A", pin: "8101", role: "client", organizationId: clientA },
    { identifier: "DEMO-PORTAL-CLIENT-B", pin: "8102", role: "client", organizationId: clientB },
    { identifier: "DEMO-PORTAL-RESELLER-A", pin: "8103", role: "reseller", organizationId: resellerA },
    { identifier: "DEMO-PORTAL-RESELLER-B", pin: "8104", role: "reseller", organizationId: resellerB }
  ]));
  const app = createApp(db, origin, accounts, external, { externalAccessEnabled: true });
  const send = (method: "GET" | "POST", url: string, cookie?: string, payload?: object) => app.inject({
    method, url, headers: { ...(cookie ? { cookie } : {}), ...(method === "POST" ? { origin } : {}) }, payload
  });
  async function login(path: string, identifier: string, pin: string) {
    const response = await send("POST", `${path}/login`, undefined, { identifier, pin });
    assert.equal(response.statusCode, 200, identifier);
    return (response.headers["set-cookie"] as string).split(";", 1)[0];
  }
  try {
    const cookies = new Map<string, string>();
    for (const [i, role] of roles.entries()) cookies.set(role,
      await login("/api", `DEMO-INTERNAL-${role.toUpperCase()}`, `90${String(i).padStart(2, "0")}`));
    const a = await login("/api/client", "DEMO-PORTAL-CLIENT-A", "8101");
    const b = await login("/api/client", "DEMO-PORTAL-CLIENT-B", "8102");
    assert.equal((await send("POST", "/api/reseller/login", undefined,
      { identifier: "DEMO-PORTAL-RESELLER-A", pin: "8103" })).statusCode, 410);
    const staff = cookies.get("sav_manager")!;
    const technician = cookies.get("sav_technician")!;
    const admin = cookies.get("global_admin")!;
    const base = "/api/portal/requests";
    assert.equal((await send("GET", base)).statusCode, 401);
    for (const externalCookie of [a, b]) {
      assert.equal((await send("GET", base, externalCookie)).statusCode, 403);
    }
    const createdClient = await send("POST", "/api/client/requests", a, {
      submissionKey: randomUUID(), requestType: "sav", deviceId: deviceA,
      subject: "DEMO besoin assistance", message: "DEMO message client"
    });
    const createdReseller = await send("POST", "/api/reseller/requests", undefined, {
      submissionKey: randomUUID(), requestType: "consumables",
      subject: "DEMO consommables", message: "DEMO message revendeur"
    });
    assert.equal(createdClient.statusCode, 201); assert.equal(createdReseller.statusCode, 400);
    assert.equal((await send("POST", "/api/reseller/requests", undefined, {
      submissionKey: randomUUID(), requestType: "general",
      subject: "DEMO refus sans session", message: "DEMO interdit"
    })).statusCode, 401);
    const id = createdClient.json().id as string;
    const resellerId = "f1000000-0000-4000-8000-000000000003"; // Historical DEMO archive.
    for (const role of roles.slice(0, 3)) {
      const cookie = cookies.get(role)!;
      const list = await send("GET", base, cookie);
      assert.equal(list.statusCode, 200, role);
      assert.equal(list.json().requests.some((r: { id: string }) => r.id === id), true);
      assert.equal(list.json().requests.some((r: { id: string }) => r.id === resellerId), true);
      const detail = (await send("GET", `${base}/${id}`, cookie)).json();
      assert.equal(detail.device_serial, "DEMO-SN-A-001");
      assert.equal(detail.message, "DEMO message client");
      assert.equal(detail.organization_name.includes("DEMO"), true);
      assert.equal(list.json().can_manage, role !== "sav_technician");
    }
    const quote = await send("POST", "/api/client/requests", a, {
      submissionKey: randomUUID(), requestType: "maintenance_quote", deviceIds: [deviceA],
      subject: "DEMO maintenance", message: "DEMO étude du parc"
    });
    assert.equal(quote.statusCode, 201);
    const quoteId = quote.json().id as string;
    const filtered = await send("GET", `${base}?requestType=maintenance_quote`, staff);
    assert.equal(filtered.statusCode, 200);
    assert.equal(filtered.json().requests.some((r: { id: string }) => r.id === quoteId), true);
    assert.equal(filtered.json().requests.some((r: { id: string }) => r.id === id), false);
    assert.equal((await send("GET", `${base}?requestType=unknown`, staff)).statusCode, 400);
    const quoteDetail = (await send("GET", `${base}/${quoteId}`, staff)).json();
    assert.deepEqual(quoteDetail.maintenance_devices, [{ model: "IC 22", serial: "DEMO-SN-A-001" }]);
    assert.deepEqual((await send("GET", `${base}/${quoteId}/compatible-cases`, staff)).json().cases, []);
    assert.equal((await send("POST", `${base}/${quoteId}/sav-case`, staff,
      { savCaseId: randomUUID() })).statusCode, 409);
    assert.equal((await send("GET", `${base}/${randomUUID()}`, staff)).statusCode, 404);
    assert.equal((await send("GET", `${base}/${id}`, a)).statusCode, 403);
    assert.equal((await send("GET", `${base}/${resellerId}`)).statusCode, 401);
    assert.equal((await send("POST", `${base}/${id}/status`, a,
      { status: "in_progress" })).statusCode, 403);
    assert.equal((await send("POST", `${base}/${id}/sav-case`, undefined,
      { savCaseId: randomUUID() })).statusCode, 401);
    assert.equal((await send("GET", `${base}/${id}`, technician)).statusCode, 200);
    assert.equal((await send("GET", `${base}/${id}/compatible-cases`, technician)).statusCode, 200);
    assert.equal((await send("POST", `${base}/${id}/status`, technician,
      { status: "in_progress" })).statusCode, 403);
    assert.equal((await send("POST", `${base}/${id}/sav-case`, technician,
      { savCaseId: randomUUID() })).statusCode, 403);
    assert.equal((await send("GET", `/api/client/requests/${id}`, a)).json().public_status, "received");
    assert.equal((await send("POST", `${base}/${id}/status`, staff, { status: "closed" })).statusCode, 409);
    assert.equal((await send("POST", `${base}/${id}/status`, staff, { status: "unknown" })).statusCode, 400);
    assert.equal((await send("POST", `${base}/${id}/status`, staff, { status: "in_progress" })).statusCode, 200);
    assert.equal((await send("GET", `/api/client/requests/${id}`, a)).json().public_status, "in_progress");
    assert.equal((await send("GET", `/api/client/requests/${id}`, b)).statusCode, 404);
    assert.equal((await send("POST", `${base}/${resellerId}/status`, staff,
      { status: "in_progress" })).statusCode, 409);
    assert.equal((await send("GET", `${base}/${resellerId}`, staff)).json().public_status, "received");

    const actor = (await db.query("SELECT id FROM users WHERE identity_subject = $1",
      ["DEMO-INTERNAL-SAV_TECHNICIAN"])).rows[0].id as string;
    const ownCase = randomUUID(); const foreignCase = randomUUID(); const differentDevice = randomUUID();
    for (const [caseId, orgId, devId, reference] of [
      [ownCase, clientA, deviceA, "DEMO-SAV-OWN"],
      [foreignCase, clientB, deviceB, "DEMO-SAV-FOREIGN"],
      [differentDevice, clientA, "e1000000-0000-4000-8000-000000000002", "DEMO-SAV-OTHER-DEVICE"]
    ]) await db.query(`INSERT INTO sav_cases(id, display_reference, client_organization_id, device_id,
      sav_reference, model, site, problem, cause, sav_action, sav_type, created_by)
      VALUES ($1,$4,$2,$3,$4,'DEMO MODEL','DEMO SITE','DEMO PROBLEM','DEMO CAUSE',
      'DEMO ACTION','technique',$5)`, [caseId, orgId, devId, reference, actor]);
    const compatible = await send("GET", `${base}/${id}/compatible-cases`, staff);
    assert.deepEqual(compatible.json().cases, [{ id: ownCase, sav_reference: "DEMO-SAV-OWN" }]);
    for (const bad of [foreignCase, differentDevice, randomUUID()]) {
      assert.equal((await send("POST", `${base}/${id}/sav-case`, staff,
        { savCaseId: bad })).statusCode, 404);
    }
    assert.equal((await send("POST", `${base}/${resellerId}/sav-case`, staff,
      { savCaseId: ownCase })).statusCode, 409);
    const link = await send("POST", `${base}/${id}/sav-case`, staff, { savCaseId: ownCase });
    assert.equal(link.statusCode, 200, link.body);
    assert.equal(link.json().linked_sav_case_id, ownCase);
    assert.equal((await send("POST", `${base}/${id}/sav-case`, staff,
      { savCaseId: ownCase })).statusCode, 409);
    assert.equal((await send("POST", `${base}/${id}/status`, staff, { status: "closed" })).statusCode, 200);
    assert.equal((await send("POST", `${base}/${id}/status`, staff,
      { status: "in_progress" })).statusCode, 409);
    const publicDetail = (await send("GET", `/api/client/requests/${id}`, a)).json();
    assert.equal(publicDetail.public_status, "closed");
    assert.deepEqual(Object.keys(publicDetail).sort(),
      ["created_at", "device_id", "device_ids", "id", "message", "public_status", "request_type", "subject"]);
    assert.equal((await send("GET", `${base}/${id}`, staff)).json().linked_sav_case_id, ownCase);
    const audits = (await db.query(`SELECT action FROM audit_events WHERE resource_kind = 'portal_request'
      AND resource_id = $1 ORDER BY id`, [id])).rows.map(row => row.action);
    assert.deepEqual(audits, ["create", "status:received:in_progress", "link_sav_case", "status:in_progress:closed"]);
    const adminRequest = await send("POST", "/api/client/requests", a, {
      submissionKey: randomUUID(), requestType: "sav", deviceId: deviceA,
      subject: "DEMO décision admin", message: "DEMO deuxième demande"
    });
    assert.equal(adminRequest.statusCode, 201);
    const adminId = adminRequest.json().id as string;
    assert.equal((await send("POST", `${base}/${adminId}/status`, admin,
      { status: "in_progress" })).statusCode, 200);
    assert.equal((await send("POST", `${base}/${adminId}/sav-case`, admin,
      { savCaseId: ownCase })).statusCode, 200);
    assert.equal((await send("GET", `/api/client/requests/${adminId}`, a)).json().public_status, "in_progress");
    // Even a direct SQL attempt cannot attach a different organization's case.
    await assert.rejects(db.query("UPDATE portal_requests SET linked_sav_case_id=$1 WHERE id=$2",
      [foreignCase, id]), { code: "23503" });
  } finally { await app.close(); await db.end(); }
});

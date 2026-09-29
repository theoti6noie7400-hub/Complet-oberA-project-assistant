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
  const roles = ["global_admin", "sav_manager", "sav_technician", "marketing", "sales", "adv", "logistics"] as const;
  const accounts = loadBetaAccounts(JSON.stringify(roles.map((role, i) => ({
    identifier: `DEMO-INTERNAL-${role.toUpperCase()}`, pin: `90${String(i).padStart(2, "0")}`, role
  }))));
  const external = loadExternalAccounts(JSON.stringify([
    { identifier: "DEMO-PORTAL-CLIENT-A", pin: "8101", role: "client", organizationId: clientA },
    { identifier: "DEMO-PORTAL-CLIENT-B", pin: "8102", role: "client", organizationId: clientB },
    { identifier: "DEMO-PORTAL-RESELLER-A", pin: "8103", role: "reseller", organizationId: resellerA },
    { identifier: "DEMO-PORTAL-RESELLER-B", pin: "8104", role: "reseller", organizationId: resellerB }
  ]));
  const app = createApp(db, origin, accounts, external);
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
    const ra = await login("/api/reseller", "DEMO-PORTAL-RESELLER-A", "8103");
    const rb = await login("/api/reseller", "DEMO-PORTAL-RESELLER-B", "8104");
    const staff = cookies.get("sav_technician")!;
    const base = "/api/portal/requests";
    assert.equal((await send("GET", base)).statusCode, 401);
    for (const role of ["marketing", "sales", "adv", "logistics"]) {
      assert.equal((await send("GET", base, cookies.get(role))).statusCode, 403, role);
    }
    for (const externalCookie of [a, b, ra, rb]) {
      assert.equal((await send("GET", base, externalCookie)).statusCode, 403);
    }
    const createdClient = await send("POST", "/api/client/requests", a, {
      submissionKey: randomUUID(), requestType: "sav", deviceId: deviceA,
      subject: "DEMO besoin assistance", message: "DEMO message client"
    });
    const createdReseller = await send("POST", "/api/reseller/requests", ra, {
      submissionKey: randomUUID(), requestType: "consumables",
      subject: "DEMO consommables", message: "DEMO message revendeur"
    });
    assert.equal(createdClient.statusCode, 201); assert.equal(createdReseller.statusCode, 201);
    const id = createdClient.json().id as string;
    const resellerId = createdReseller.json().id as string;
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
    }
    assert.equal((await send("GET", `${base}/${randomUUID()}`, staff)).statusCode, 404);
    assert.equal((await send("GET", `${base}/${id}`, a)).statusCode, 403);
    assert.equal((await send("GET", `${base}/${resellerId}`, ra)).statusCode, 403);
    for (const role of ["marketing", "sales", "adv", "logistics"]) {
      assert.equal((await send("POST", `${base}/${id}/status`, cookies.get(role),
        { status: "in_progress" })).statusCode, 403);
      assert.equal((await send("POST", `${base}/${id}/sav-case`, cookies.get(role),
        { savCaseId: randomUUID() })).statusCode, 403);
    }
    assert.equal((await send("POST", `${base}/${id}/status`, a,
      { status: "in_progress" })).statusCode, 403);
    assert.equal((await send("POST", `${base}/${id}/sav-case`, ra,
      { savCaseId: randomUUID() })).statusCode, 403);
    assert.equal((await send("POST", `${base}/${id}/status`, staff, { status: "closed" })).statusCode, 409);
    assert.equal((await send("POST", `${base}/${id}/status`, staff, { status: "unknown" })).statusCode, 400);
    assert.equal((await send("POST", `${base}/${id}/status`, staff, { status: "in_progress" })).statusCode, 200);
    assert.equal((await send("GET", `/api/client/requests/${id}`, a)).json().public_status, "in_progress");
    assert.equal((await send("GET", `/api/client/requests/${id}`, b)).statusCode, 404);
    assert.equal((await send("POST", `${base}/${resellerId}/status`, staff,
      { status: "in_progress" })).statusCode, 200);
    assert.equal((await send("GET", `/api/reseller/requests/${resellerId}`, ra)).json().public_status, "in_progress");
    assert.equal((await send("GET", `/api/reseller/requests/${resellerId}`, rb)).statusCode, 404);

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
      ["created_at", "device_id", "id", "message", "public_status", "request_type", "subject"]);
    assert.equal((await send("GET", `${base}/${id}`, staff)).json().linked_sav_case_id, ownCase);
    const audits = (await db.query(`SELECT action FROM audit_events WHERE resource_kind = 'portal_request'
      AND resource_id = $1 ORDER BY id`, [id])).rows.map(row => row.action);
    assert.deepEqual(audits, ["create", "status:received:in_progress", "link_sav_case", "status:in_progress:closed"]);
    // Even a direct SQL attempt cannot attach a different organization's case.
    await assert.rejects(db.query("UPDATE portal_requests SET linked_sav_case_id=$1 WHERE id=$2",
      [foreignCase, id]), { code: "23503" });
  } finally { await app.close(); await db.end(); }
});

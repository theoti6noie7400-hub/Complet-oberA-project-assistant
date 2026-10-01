import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createLocalRecipeApi } from "./api.mjs";

const ic22 = "e1000000-0000-4000-8000-000000000001";
const dust = "e1000000-0000-4000-8000-000000000002";
const other = "e1000000-0000-4000-8000-000000000003";

async function serve(dataFile) {
  const handler = createLocalRecipeApi(dataFile);
  const server = createServer((req, res) => handler(req, res, () => { res.writeHead(404); res.end(); }));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const call = async (method, path, cookie, payload) => {
    const response = await fetch(`${origin}${path}`, { method, headers: {
      ...(cookie ? { cookie } : {}), ...(method === "POST" ? { origin, "Content-Type": "application/json" } : {})
    }, ...(method === "POST" ? { body: JSON.stringify(payload ?? {}) } : {}) });
    const text = await response.text();
    return { status: response.status, data: text && response.headers.get("content-type")?.includes("json") ? JSON.parse(text) : text,
      cookie: response.headers.get("set-cookie")?.split(";")[0], headers: response.headers };
  };
  const login = async (path, identifier, pin) => {
    const response = await call("POST", path, null, { identifier, pin });
    assert.equal(response.status, 200);
    return response.cookie;
  };
  return { server, call, login, close: () => new Promise(resolve => server.close(resolve)) };
}

test("recette locale : Client, SAV, droits, persistance et remise à zéro", async t => {
  const dir = await mkdtemp(join(tmpdir(), "obera-local-recipe-"));
  const file = join(dir, "state.json");
  t.after(() => rm(dir, { recursive: true, force: true }));
  let api = await serve(file);
  t.after(async () => { if (api) await api.close(); });
  const { call, login } = api;

  assert.equal((await call("GET", "/api/session")).status, 401);
  assert.equal((await call("POST", "/api/client/login", null,
    { identifier: "DEMO-CLIENT-A", pin: "incorrect" })).status, 401);
  const a = await login("/api/client/login", "DEMO-CLIENT-A", "1234");
  const b = await login("/api/client/login", "DEMO-CLIENT-B", "1234");
  const staff = await login("/api/login", "DEMO-STAFF", "1789");
  const technician = await login("/api/login", "DEMO-SAV-TECH", "1789");
  assert.deepEqual((await call("GET", "/api/client/devices", a)).data.devices.map(item => item.serial),
    ["DEMO-SN-A-001", "DEMO-SN-A-002"]);
  assert.deepEqual((await call("GET", "/api/client/devices", b)).data.devices.map(item => item.serial),
    ["DEMO-SN-B-001"]);
  assert.equal((await call("GET", `/api/client/devices/${other}`, a)).status, 404);
  assert.equal((await call("GET", `/api/client/devices/${ic22}`, staff)).status, 403);
  assert.equal((await call("GET", `/api/client/devices/${ic22}/notice`, a)).status, 200);
  const notice = await call("GET", `/api/client/devices/${ic22}/notice`, a);
  assert.match(notice.data, /DOCUMENT DEMO/);
  assert.match(notice.headers.get("content-disposition"), /\.txt/);
  assert.equal((await call("GET", `/api/client/devices/${dust}/notice`, a)).status, 404);
  assert.equal((await call("GET", `/api/client/devices/${ic22}/notice`, b)).status, 404);
  assert.equal((await call("GET", "/api/portal/requests", a)).status, 403);

  const diagnosticContext = { version: 1, productId: "ic22", result: "unresolved", steps: [
    { nodeId: "start", optionIndex: 1 }, { nodeId: "no-power", optionIndex: 1 },
    { nodeId: "power-check-advice", confirmed: true }
  ] };
  const sav = { submissionKey: randomUUID(), requestType: "sav", deviceId: ic22,
    subject: "DEMO souci de démarrage", message: "DEMO vérification client", diagnosticContext };
  const created = await call("POST", "/api/client/requests", a, sav);
  assert.equal(created.status, 201);
  assert.equal((await call("POST", "/api/client/requests", a, sav)).status, 200);
  assert.equal((await call("POST", "/api/client/requests", a, { ...sav, message: "autre" })).status, 409);
  const id = created.data.id;
  assert.equal((await call("GET", `/api/client/requests/${id}`, b)).status, 404);
  assert.equal((await call("GET", `/api/client/requests/${id}`, a)).data.diagnostic_context, undefined);
  const internal = await call("GET", `/api/portal/requests/${id}`, staff);
  assert.equal(internal.data.device_model, "IC 22");
  assert.equal(internal.data.diagnostic_context.steps[2].clientConfirmed, true);
  assert.equal(internal.data.diagnostic_context.device.serial, "DEMO-SN-A-001");
  assert.equal(internal.data.diagnostic_context.graphFingerprintVersion, 2);
  assert.equal(Object.hasOwn(internal.data.diagnostic_context, "cause"), false);
  assert.equal((await call("GET", "/api/portal/requests", technician)).data.can_manage, false);
  assert.equal((await call("POST", `/api/portal/requests/${id}/status`, technician,
    { status: "in_progress" })).status, 403);
  assert.equal((await call("POST", `/api/portal/requests/${id}/sav-case`, technician,
    { savCaseId: randomUUID() })).status, 403);
  assert.equal((await call("POST", `/api/portal/requests/${id}/status`, a,
    { status: "in_progress" })).status, 403);
  assert.equal((await call("POST", `/api/portal/requests/${id}/status`, staff,
    { status: "closed" })).status, 409);
  assert.equal((await call("POST", `/api/portal/requests/${id}/status`, staff,
    { status: "in_progress" })).status, 200);
  assert.equal((await call("GET", `/api/client/requests/${id}`, a)).data.public_status, "in_progress");
  const manager = await login("/api/login", "DEMO-SAV-MANAGER", "1789");
  assert.equal((await call("POST", `/api/portal/requests/${id}/status`, manager,
    { status: "closed" })).status, 200);
  assert.equal((await call("GET", `/api/client/requests/${id}`, a)).data.public_status, "closed");

  const consumables = await call("POST", "/api/client/requests", a,
    { submissionKey: randomUUID(), requestType: "consumables", deviceId: dust,
      subject: "DEMO filtres", message: "DEMO quantité à confirmer" });
  assert.equal(consumables.status, 201);
  const maintenance = await call("POST", "/api/client/requests", a,
    { submissionKey: randomUUID(), requestType: "maintenance_quote", deviceIds: [ic22, dust],
      subject: "DEMO contrat", message: "DEMO deux appareils" });
  assert.equal(maintenance.status, 201);
  assert.deepEqual(maintenance.data.device_ids, [ic22, dust]);
  assert.equal((await call("POST", "/api/client/requests", a,
    { submissionKey: randomUUID(), requestType: "maintenance_quote", deviceIds: [],
      subject: "DEMO contrat général", message: "DEMO sans appareil" })).status, 201);
  assert.equal((await call("POST", "/api/client/requests", a,
    { ...sav, submissionKey: randomUUID(), deviceId: other })).status, 404);
  assert.equal((await call("POST", "/api/client/requests", a,
    { ...sav, submissionKey: randomUUID(), diagnosticContext: { ...diagnosticContext, productId: "dustomat4-24" } })).status, 400);
  assert.equal((await call("POST", "/api/client/requests", a,
    { submissionKey: randomUUID(), requestType: "maintenance_quote", deviceIds: [ic22, other],
      subject: "DEMO autre parc", message: "DEMO refus" })).status, 404);
  assert.equal((await call("GET", "/api/client/requests", b)).data.requests.length, 0);
  assert.equal((await call("GET", "/api/portal/requests", staff)).data.requests.length, 4);

  // Restart the mock server to prove the DEMO request history survives more than a page reload.
  await api.close();
  api = await serve(file);
  const afterRestartA = await api.login("/api/client/login", "DEMO-CLIENT-A", "1234");
  assert.equal((await api.call("GET", "/api/client/requests", afterRestartA)).data.requests.length, 4);
  const afterRestartStaff = await api.login("/api/login", "DEMO-STAFF", "1789");
  assert.equal((await api.call("GET", `/api/portal/requests/${id}`, afterRestartStaff)).data.public_status, "closed");
  assert.equal((JSON.parse(await readFile(file, "utf8"))).audit.length, 2);
  assert.equal((await api.call("POST", "/api/logout", afterRestartA)).status, 200);
  assert.equal((await api.call("GET", "/api/session", afterRestartA)).status, 401);
  assert.equal((await api.call("POST", "/api/local-recipe/reset", null)).status, 200);
  assert.equal((await api.call("GET", "/api/session", afterRestartStaff)).status, 401);
  const fresh = await api.login("/api/client/login", "DEMO-CLIENT-A", "1234");
  assert.deepEqual((await api.call("GET", "/api/client/requests", fresh)).data.requests, []);
});

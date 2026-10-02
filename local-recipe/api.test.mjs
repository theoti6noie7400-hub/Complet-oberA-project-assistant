import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { createLocalRecipeApi } from "./api.mjs";
import { importLocalNotices, localNotice } from "./notices.mjs";

const ic22 = "e1000000-0000-4000-8000-000000000001";
const dust = "e1000000-0000-4000-8000-000000000002";
const other = "e1000000-0000-4000-8000-000000000003";

async function serve(dataFile, noticeOptions) {
  const handler = createLocalRecipeApi(dataFile, noticeOptions);
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
  const sourceDir = join(dir, "source");
  const noticeRoot = join(dir, "private");
  await mkdir(sourceDir);
  const noticeSources = ["IC 22", "DUSTOMAT 4-24"].map((model, index) => {
    const data = Buffer.from(`%PDF-1.4\n% NOTICE FICTIVE TEST ${model}\n%%EOF\n`);
    return { model, file: `DEMO-${index}.pdf`,
      sha256: createHash("sha256").update(data).digest("hex"), data };
  });
  const options = { noticeRoot, noticeSources, externalAccessEnabled: true };
  t.after(() => rm(dir, { recursive: true, force: true }));
  let api = await serve(file, options);
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
  assert.equal((await call("GET", `/api/client/devices/${ic22}`, a)).data.notice_available, false);
  assert.equal((await call("GET", `/api/client/devices/${dust}`, a)).data.notice_available, false);
  assert.equal((await call("GET", `/api/client/devices/${ic22}/notice`, a)).status, 404);
  assert.equal(await localNotice(noticeRoot, "ePURFresh 150", noticeSources), null);
  for (const notice of noticeSources) await writeFile(join(sourceDir, notice.file), notice.data);
  await assert.rejects(importLocalNotices(sourceDir, noticeRoot,
    noticeSources.map((item, index) => index ? { ...item, sha256: "0".repeat(64) } : item)));
  assert.equal((await call("GET", `/api/client/devices/${ic22}/notice`, a)).status, 404);
  assert.equal(await importLocalNotices(sourceDir, noticeRoot, noticeSources), 2);
  assert.deepEqual((await call("GET", "/api/client/devices", a)).data.devices.map(item => item.notice_available),
    [true, true]);
  for (const [device, source] of [[ic22, noticeSources[0]], [dust, noticeSources[1]]]) {
    const notice = await call("GET", `/api/client/devices/${device}/notice`, a);
    assert.equal(notice.status, 200);
    assert.equal(notice.headers.get("content-type"), "application/pdf");
    assert.match(notice.headers.get("content-disposition"), /\.pdf/);
    assert.equal(notice.data, source.data.toString());
  }
  assert.equal((await call("GET", `/api/client/devices/${ic22}/notice`, staff)).status, 403);
  assert.equal((await call("GET", `/api/client/devices/${ic22}/notice`, b)).status, 404);
  assert.equal((await call("GET", `/api/client/devices/${other}/notice`, a)).status, 404);
  assert.equal((await call("GET", `/api/client/devices/${other}/notice`, b)).status, 200);
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
  assert.equal(consumables.status, 400);
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
  assert.equal((await call("GET", "/api/portal/requests", staff)).data.requests.length, 3);

  await api.close();
  api = await serve(file, options);
  const afterRestartA = await api.login("/api/client/login", "DEMO-CLIENT-A", "1234");
  assert.equal((await api.call("GET", "/api/client/requests", afterRestartA)).data.requests.length, 3);
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

test("recette V1 : le Commercial utilise le catalogue diagnostic sans données Client", async t => {
  const dir = await mkdtemp(join(tmpdir(), "obera-v1-recipe-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = join(dir, "state.json");
  const sourceDir = join(dir, "source");
  const noticeRoot = join(dir, "private");
  await mkdir(sourceDir);
  const data = Buffer.from("%PDF-1.4\n% NOTICE COMMERCIAL TEST IC22\n%%EOF\n");
  const noticeSources = [{ model: "IC 22", file: "DEMO-COMMERCIAL-IC22.pdf",
    sha256: createHash("sha256").update(data).digest("hex"), data }];
  await writeFile(join(sourceDir, noticeSources[0].file), data);
  await importLocalNotices(sourceDir, noticeRoot, noticeSources);
  const item = { id: randomUUID(), kind: "client", organization_id: "a1000000-0000-4000-8000-000000000001",
    organization_name: "CLIENT DEMO ALPHA", author_identifier: "DEMO-CLIENT-A",
    request_type: "consumables", device_id: null, device_ids: [], subject: "DEMO archive",
    message: "DEMO historique", public_status: "received", created_at: new Date().toISOString(),
    diagnostic_context: null };
  await writeFile(file, JSON.stringify({ requests: [item], audit: [] }));
  const api = await serve(file, { noticeRoot, noticeSources });
  t.after(() => api.close());

  assert.equal((await api.call("POST", "/api/client/login", null,
    { identifier: "DEMO-CLIENT-A", pin: "1234" })).status, 410);
  const staff = await api.login("/api/login", "DEMO-STAFF", "1789");
  const technician = await api.login("/api/login", "DEMO-SAV-TECH", "1789");
  const commercial = await api.login("/api/login", "DEMO-COMMERCIAL", "2468");

  const clients = await api.call("GET", "/api/sav/clients", technician);
  assert.equal(clients.status, 200);
  assert.equal(clients.data.clients.find(client => client.name === "CLIENT DEMO ALPHA").device_count, 2);
  const park = await api.call("GET", "/api/sav/clients/a1000000-0000-4000-8000-000000000001/devices", staff);
  assert.deepEqual(park.data.devices.map(device => device.serial), ["DEMO-SN-A-001", "DEMO-SN-A-002"]);

  assert.equal((await api.call("GET", "/api/session", commercial)).data.role, "commercial");
  assert.equal((await api.call("GET", "/api/sav/clients", commercial)).status, 403);
  assert.equal((await api.call("GET", `/api/sav/clients/a1000000-0000-4000-8000-000000000001/devices/${ic22}`, commercial)).status, 403);
  assert.equal((await api.call("GET", `/api/sav/devices/${ic22}/notice`, commercial)).status, 403);
  assert.equal((await api.call("GET", "/api/portal/requests", commercial)).status, 403);
  assert.equal((await api.call("GET", `/api/portal/requests/${item.id}`, commercial)).status, 403);
  assert.equal((await api.call("GET", "/api/client/devices", commercial)).status, 403);

  const catalog = await api.call("GET", "/api/internal/catalog/notices", commercial);
  assert.equal(catalog.status, 200);
  assert.deepEqual(catalog.data.models, ["IC 22"]);
  const notice = await api.call("GET", "/api/internal/catalog/notices/IC%2022", commercial);
  assert.equal(notice.status, 200);
  assert.equal(notice.headers.get("content-type"), "application/pdf");
  assert.equal(notice.data, data.toString());
  assert.equal((await api.call("GET", "/api/internal/catalog/notices", staff)).status, 403);

  const views = (JSON.parse(await readFile(file, "utf8"))).audit;
  assert.ok(views.some(entry => entry.actor === "DEMO-COMMERCIAL" &&
    entry.action === "catalog_notice_download" && entry.model === "IC 22"));
  assert.equal(views.some(entry => entry.actor === "DEMO-COMMERCIAL" && entry.organization_id), false);
  assert.equal((JSON.parse(await readFile(file, "utf8"))).requests.length, 1);
});

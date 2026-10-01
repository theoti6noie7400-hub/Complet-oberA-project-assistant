import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLocalRecipeApi } from "./api.mjs";
import { importAvailableLocalNotices } from "./notices.mjs";
import { importPrivateClients, loadPrivateClients, validateClientSource } from "./private-clients.mjs";

test("comptes locaux privés, parcs distincts, notices et demandes sans données réelles dans les fixtures", async t => {
  const dir = await mkdtemp(join(tmpdir(), "obera-private-clients-test-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const sourceFile = join(dir, "source.json"), target = join(dir, "private-data", "clients.json");
  const first = { identifier: "TEST-CLIENT-ONE", pin: "1234", organizationName: "ORGANISATION TEST ONE",
    devices: [...Array.from({ length: 9 }, (_, i) => ({ model: "IC 22", serial: `FAKE-IC22-${i}` })),
      ...Array.from({ length: 6 }, (_, i) => ({ model: "IC 12", serial: `FAKE-IC12-${i}` }))] };
  const second = { identifier: "TEST-CLIENT-TWO", pin: "5678", organizationName: "ORGANISATION TEST TWO",
    devices: [...Array.from({ length: 20 }, (_, i) => ({ model: "ePUR EX 1000", serial: `FAKE-EPUR-${i}` })),
      ...Array.from({ length: 3 }, (_, i) => ({ model: "Clearbox", serial: `FAKE-CLEAR-${i}` }))] };
  const source = { version: 1, clients: [first, second] };
  assert.throws(() => validateClientSource({ ...source, clients: [{ ...first, notes: "internal" }] }));
  assert.throws(() => validateClientSource({ ...source, clients: [{ ...first, identifier: "DEMO-STAFF" }] }));
  assert.throws(() => validateClientSource({ ...source, clients: [{ ...first, devices: [{ ...first.devices[0], site: "private" }] }] }));
  await writeFile(sourceFile, JSON.stringify(source));
  assert.deepEqual(await importPrivateClients(sourceFile, target), { clients: 2, devices: 38 });
  const stored = await readFile(target, "utf8");
  assert.equal(stored.includes('"pin":"1234"'), false);
  assert.equal(stored.includes('"pin":"5678"'), false);
  const privateClients = await loadPrivateClients(target);
  const ids = privateClients.map(client => client.organizationId);
  assert.notEqual(ids[0], ids[1]);
  const stable = privateClients[0].devices[0].id;
  await importPrivateClients(sourceFile, target);
  assert.equal((await loadPrivateClients(target))[0].devices[0].id, stable);

  const noticeSourceDir = join(dir, "source-pdfs"), noticeRoot = join(dir, "private-notices");
  await mkdir(noticeSourceDir);
  const noticeSources = ["IC 22", "DUSTOMAT 4-24", "IC 12", "ePUR EX 1000", "Clearbox"].map(model => {
    const data = Buffer.from(`%PDF-1.4\n% SYNTHETIC ${model}\n%%EOF\n`);
    return { model, file: `${model}.pdf`, sha256: createHash("sha256").update(data).digest("hex"), data };
  });
  for (const source of noticeSources.slice(0, 2)) await writeFile(join(noticeSourceDir, source.file), source.data);
  assert.equal((await importAvailableLocalNotices(noticeSourceDir, noticeRoot, noticeSources)).count, 2);
  for (const source of noticeSources.slice(2)) await writeFile(join(noticeSourceDir, source.file), source.data);
  assert.equal((await importAvailableLocalNotices(noticeSourceDir, noticeRoot, noticeSources.slice(2))).count, 3);
  const handler = createLocalRecipeApi(join(dir, "state.json"), { privateClients,
    noticeRoot, noticeSources });
  const server = createServer((req, res) => handler(req, res, () => { res.writeHead(404); res.end(); }));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  async function call(method, path, cookie, payload) {
    return fetch(origin + path, { method, headers: { ...(cookie ? { cookie } : {}),
      ...(method === "POST" ? { origin, "Content-Type": "application/json" } : {}) },
      ...(method === "POST" ? { body: JSON.stringify(payload ?? {}) } : {}) });
  }
  async function login(identifier, pin) {
    const response = await call("POST", "/api/client/login", null, { identifier, pin });
    assert.equal(response.status, 200);
    return response.headers.get("set-cookie").split(";")[0];
  }
  assert.equal((await call("GET", "/api/local-recipe/info")).status, 200);
  assert.equal((await (await call("GET", "/api/local-recipe/info")).json()).private_data_loaded, true);
  assert.equal((await call("POST", "/api/client/login", null,
    { identifier: first.identifier, pin: "wrong" })).status, 401);
  const a = await login(first.identifier, first.pin);
  const b = await login(second.identifier, second.pin);
  const demo = await login("DEMO-CLIENT-A", "1234");
  const ownA = (await (await call("GET", "/api/client/devices", a)).json()).devices;
  const ownB = (await (await call("GET", "/api/client/devices", b)).json()).devices;
  assert.equal(ownA.length, 15);
  assert.deepEqual([ownA.filter(d => d.model === "IC 22").length, ownA.filter(d => d.model === "IC 12").length], [9, 6]);
  assert.equal(ownB.length, 23);
  assert.deepEqual([ownB.filter(d => d.model === "ePUR EX 1000").length,
    ownB.filter(d => d.model === "Clearbox").length], [20, 3]);
  assert.equal((await (await call("GET", "/api/client/devices", demo)).json()).devices.length, 2);
  for (const item of [...ownA, ...ownB]) {
    const own = ownA.includes(item) ? a : b, foreign = ownA.includes(item) ? b : a;
    assert.equal(item.notice_available, true);
    const download = await call("GET", `/api/client/devices/${item.id}/notice`, own);
    assert.equal(download.status, 200);
    assert.equal(download.headers.get("content-type"), "application/pdf");
    const expected = noticeSources.find(source => source.model === item.model);
    assert.equal(createHash("sha256").update(Buffer.from(await download.arrayBuffer())).digest("hex"), expected.sha256);
    assert.equal((await call("GET", `/api/client/devices/${item.id}`, foreign)).status, 404);
    assert.equal((await call("GET", `/api/client/devices/${item.id}/notice`, foreign)).status, 404);
  }
  const device = ownA[0];
  const request = await call("POST", "/api/client/requests", a, { submissionKey: randomUUID(),
    requestType: "sav", deviceId: device.id, subject: "TEST request", message: "TEST only" });
  assert.equal(request.status, 201);
  const requestId = (await request.json()).id;
  assert.equal((await call("GET", `/api/client/requests/${requestId}`, b)).status, 404);
  assert.equal((await call("GET", `/api/client/requests/${requestId}`, a)).status, 200);
  const admin = await call("POST", "/api/login", null, { identifier: "DEMO-STAFF", pin: "1789" });
  const staff = admin.headers.get("set-cookie").split(";")[0];
  assert.equal((await call("GET", `/api/portal/requests/${requestId}`, staff)).status, 200);
  await call("POST", "/api/local-recipe/reset");
  assert.equal((await loadPrivateClients(target)).length, 2);
  assert.equal((await login(first.identifier, first.pin)).length > 0, true);
});

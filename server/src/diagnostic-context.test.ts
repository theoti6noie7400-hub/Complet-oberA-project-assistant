import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { resolveDiagnosticPath, type DiagnosticPath } from "../../src/lib/diagnosticContext.ts";
import { fingerprintDiagnosticGraph } from "./diagnostic-fingerprint.ts";
import { createApp } from "./app.ts";
import type { Database } from "./db.ts";

const deviceA = "e1000000-0000-4000-8000-000000000001";
const orgA = "a1000000-0000-4000-8000-000000000001";
const orgB = "a1000000-0000-4000-8000-000000000002";
const origin = "https://portail-demo.example.invalid";
const path: DiagnosticPath = { version: 1, productId: "ic12", result: "unresolved",
  steps: [{ nodeId: "start", optionIndex: 3 }, { nodeId: "contact-sav-general" }] };

test("graph path validates model, actual branch, terminal and explicit confirmations", () => {
  const valid = resolveDiagnosticPath(path, "IC 12");
  assert.equal(valid?.symptom, "J'ai un autre problème");
  assert.equal(valid?.steps[0].answer, "J'ai un autre problème");
  assert.equal(resolveDiagnosticPath(path, "IC 22"), null);
  assert.equal(resolveDiagnosticPath(path, "DUSTOMAT 4-24"), null);
  assert.equal(resolveDiagnosticPath({ ...path, productId: "ic22" }, "IC 12"), null);
  assert.equal(resolveDiagnosticPath({ ...path, steps: Array(31).fill(path.steps[0]) }, "IC 12"), null);
  assert.equal(resolveDiagnosticPath({ ...path, steps: [{ nodeId: "start", optionIndex: 3 }] }, "IC 12"), null);
  assert.equal(resolveDiagnosticPath({ ...path, steps: [path.steps[0], { nodeId: "no-power" }] }, "IC 12"), null);
  assert.equal(resolveDiagnosticPath({ ...path, steps: [{ nodeId: "start", optionIndex: 9 }, path.steps[1]] }, "IC 12"), null);
  assert.equal(resolveDiagnosticPath({ ...path, steps: [...path.steps, path.steps[1]] }, "IC 12"), null);
  assert.equal(resolveDiagnosticPath({ ...path, steps: [{ nodeId: "start", optionIndex: 1 },
    { nodeId: "no-power", optionIndex: 1 }, { nodeId: "power-check-advice", confirmed: true }] }, "IC 12")
    ?.steps[2].clientConfirmed, true);
});

test("client diagnostic snapshot is derived from its own device and is never included in public projection", async () => {
  const cookieA = `obera_session=${"a".repeat(64)}`;
  const cookieB = `obera_session=${"b".repeat(64)}`;
  const hashA = createHash("sha256").update("a".repeat(64)).digest("hex");
  let snapshot: Record<string, unknown> | null = null;
  let audits = 0;
  const run = async (sql: string, values: unknown[] = []) => {
    if (sql.includes("FROM sessions s")) {
      const user = values[0] === hashA ? ["DEMO-USER-A", orgA] : ["DEMO-USER-B", orgB];
      return { rows: [{ id: user[0], role: "client", organization_id: user[1], organization_kind: "client" }], rowCount: 1 };
    }
    if (sql.includes("FROM devices") && sql.includes("client_organization_id"))
      return { rows: values[0] === deviceA && values[1] === orgA ?
        [{ id: deviceA, model: "IC 12", serial: "DEMO-SN-SERVER-ONLY" }] : [], rowCount: 1 };
    if (sql.includes("INSERT INTO portal_requests")) {
      snapshot = JSON.parse(values[10] as string) as Record<string, unknown>;
      return { rows: [{ id: values[0] }], rowCount: 1 };
    }
    if (sql.includes("INSERT INTO audit_events")) { audits++; return { rows: [], rowCount: 1 }; }
    if (sql.includes("FROM portal_requests WHERE id = $1"))
      return { rows: [{ id: values[0], request_type: "sav", device_id: deviceA,
        device_ids: [], subject: "DEMO diagnostic", message: "DEMO commentaire", public_status: "received" }], rowCount: 1 };
    return { rows: [], rowCount: 0 };
  };
  const db = { query: run, connect: async () => ({ query: run, release() {} }) } as unknown as Database;
  const app = createApp(db, origin);
  const payload = { submissionKey: "90000000-0000-4000-8000-000000000001", requestType: "sav",
    deviceId: deviceA, subject: "DEMO diagnostic", message: "DEMO commentaire", diagnosticContext: path };
  const send = (cookie: string, body: object) => app.inject({ method: "POST", url: "/api/client/requests",
    headers: { cookie, origin }, payload: body });
  try {
    assert.equal((await send(cookieB, payload)).statusCode, 404);
    assert.equal((await send(cookieA, { ...payload, requestType: "consumables" })).statusCode, 400);
    assert.equal((await send(cookieA, { ...payload, requestType: "maintenance_quote",
      deviceId: undefined, deviceIds: [] })).statusCode, 400);
    assert.equal((await send(cookieA, { ...payload, diagnosticContext: { ...path,
      steps: Array(31).fill(path.steps[0]) } })).statusCode, 400);
    assert.equal((await send(cookieA, { ...payload, diagnosticContext: { ...path,
      productId: "X".repeat(12001) } })).statusCode, 400);
    assert.equal((await send(cookieA, { ...payload, diagnosticContext: { ...path,
      productId: "ic22" } })).statusCode, 400);
    assert.equal((await send(cookieA, { ...payload, diagnosticContext: { ...path,
      steps: [{ nodeId: "start", optionIndex: 3 }, { nodeId: "no-power" }] } })).statusCode, 400);
    const created = await send(cookieA, payload);
    assert.equal(created.statusCode, 201, created.body);
    const stored = snapshot as Record<string, unknown> | null;
    assert.ok(stored);
    assert.equal((stored.device as { serial: string }).serial, "DEMO-SN-SERVER-ONLY");
    assert.equal(stored.symptom, "J'ai un autre problème");
    assert.equal(stored.comment, "DEMO commentaire");
    assert.equal(stored.result, "unresolved");
    assert.equal(stored.graphFingerprintVersion, 2);
    assert.equal(stored.graphFingerprint, fingerprintDiagnosticGraph());
    assert.equal(Object.hasOwn(stored, "cause"), false);
    assert.equal(Object.hasOwn(stored, "sav_action"), false);
    assert.equal(Object.hasOwn(created.json(), "diagnostic_context"), false);
    assert.equal(Object.hasOwn(created.json(), "cause"), false);
    assert.equal(Object.hasOwn(created.json(), "sav_action"), false);
    assert.equal(audits, 1);
  } finally { await app.close(); }
});

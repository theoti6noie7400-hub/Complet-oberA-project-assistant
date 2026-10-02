import assert from "node:assert/strict";
import { test } from "node:test";
import { createApp } from "./app.ts";
import type { Database } from "./db.ts";

const origin = "https://portal.example.invalid";
const cookie = `obera_session=${"a".repeat(64)}`;
const clientId = "10000000-0000-4000-8000-000000000001";
const caseId = "20000000-0000-4000-8000-000000000002";

function fakeDatabase(role: string) {
  const statements: { sql: string; values: unknown[] }[] = [];
  const run = async (sql: string, values: unknown[] = []) => {
    statements.push({ sql, values });
    if (sql.includes("FROM sessions s")) return { rows: [{
      id: "30000000-0000-4000-8000-000000000003", role,
      organization_id: role === "client" ? clientId : null,
      organization_kind: role === "client" ? "client" : null
    }], rowCount: 1 };
    if (sql.includes("INSERT INTO sav_cases")) return { rows: [{
      id: values[0], sav_reference: values[1], serial_number: values[2],
      client_name: values[3], client_number: values[4], model: values[5], site: values[6],
      problem: values[7], cause: values[8], sav_action: values[9], sav_type: values[10],
      status: "open", request_hash: values[13]
    }], rowCount: 1 };
    if (sql.includes("FROM sav_cases WHERE id")) return { rows: [{ id: caseId, client_organization_id: clientId, cause: "fictional cause" }], rowCount: 1 };
    if (sql.includes("FROM sav_cases ORDER BY")) return { rows: [{ id: caseId, client_organization_id: clientId }], rowCount: 1 };
    return { rows: [], rowCount: 0 };
  };
  const db = { query: run, connect: async () => ({ query: run, release() {} }) } as unknown as Database;
  return { db, statements };
}

test("API denies unauthenticated, marketing and client requests to internal SAV", async () => {
  const { db, statements } = fakeDatabase("marketing");
  const app = createApp(db, origin);
  try {
    assert.equal((await app.inject({ method: "GET", url: "/api/sav/cases" })).statusCode, 401);
    assert.equal((await app.inject({ method: "GET", url: "/api/sav/cases", headers: { cookie } })).statusCode, 401);
    assert.equal((await app.inject({ method: "GET", url: `/api/sav/cases/${caseId}`, headers: { cookie } })).statusCode, 401);
    assert.equal(statements.some(s => s.sql.includes("FROM sav_cases")), false);
  } finally { await app.close(); }
  const client = createApp(fakeDatabase("client").db, origin);
  try {
    assert.equal((await client.inject({ method: "GET", url: "/api/sav/cases", headers: { cookie } })).statusCode, 403);
    assert.equal((await client.inject({ method: "POST", url: "/api/sav/cases", headers: { cookie, origin }, payload: {
      submissionKey: "40000000-0000-4000-8000-000000000004", savReference: "FICTIF",
      serialNumber: "", clientName: "Client fictif", clientNumber: "CL-FICTIF",
      model: "Fictif", site: "Fictif", problem: "Fictif", cause: "Fictif",
      savAction: "Fictif", savType: "technique"
    } })).statusCode, 403);
  } finally { await client.close(); }
});

test("V1 closes external login and API, including an old Client session, while keeping internal SAV", async () => {
  const app = createApp(fakeDatabase("client").db, origin);
  try {
    assert.equal((await app.inject({ method: "POST", url: "/api/client/login", headers: { origin },
      payload: { identifier: "DEMO-CLIENT-A", pin: "1234" } })).statusCode, 410);
    assert.equal((await app.inject({ method: "GET", url: "/api/session", headers: { cookie } })).statusCode, 401);
    assert.equal((await app.inject({ method: "GET", url: "/api/client/devices", headers: { cookie } })).statusCode, 404);
    assert.equal((await app.inject({ method: "POST", url: "/api/client/requests", headers: { cookie, origin },
      payload: { requestType: "consumables" } })).statusCode, 404);
    assert.equal((await app.inject({ method: "GET", url: "/api/sav/clients", headers: { cookie } })).statusCode, 403);
  } finally { await app.close(); }
  const sav = createApp(fakeDatabase("sav_technician").db, origin);
  try {
    assert.equal((await sav.inject({ method: "GET", url: "/api/sav/clients", headers: { cookie } })).statusCode, 200);
  } finally { await sav.close(); }
});

test("readiness checks PostgreSQL and exposes no database error", async () => {
  const healthy = createApp({ query: async () => ({ rows: [{ '?column?': 1 }] }) } as unknown as Database, origin);
  assert.equal((await healthy.inject({ method: "GET", url: "/api/ready" })).statusCode, 200);
  await healthy.close();
  const unavailable = createApp({ query: async () => { throw new Error("database secret details"); } } as unknown as Database, origin);
  const response = await unavailable.inject({ method: "GET", url: "/api/ready" });
  assert.equal(response.statusCode, 503);
  assert.equal(response.body.includes("database secret details"), false);
  await unavailable.close();
});

test("technician can consult all cases; malformed IDs are rejected", async () => {
  const app = createApp(fakeDatabase("sav_technician").db, origin);
  try {
    const list = await app.inject({ method: "GET", url: "/api/sav/cases", headers: { cookie } });
    assert.equal(list.statusCode, 200);
    assert.equal(list.json().cases[0].id, caseId);
    const detail = await app.inject({ method: "GET", url: `/api/sav/cases/${caseId}`, headers: { cookie } });
    assert.equal(detail.statusCode, 200);
    assert.equal((await app.inject({ method: "GET", url: "/api/sav/cases/invalid", headers: { cookie } })).statusCode, 400);
  } finally { await app.close(); }
});

test("manual SAV creation retains each field and its audit in a transaction", async () => {
  const { db, statements } = fakeDatabase("sav_technician");
  const app = createApp(db, origin);
  const body = {
    submissionKey: "40000000-0000-4000-8000-000000000004",
    savReference: "REF-FICTIVE", serialNumber: "SERIE-FICTIVE",
    clientName: "Client fictif", clientNumber: "CL-FICTIF", model: "Appareil fictif",
    site: "Site fictif", problem: "Panne fictive", cause: "Cause fictive",
    savAction: "Action fictive", savType: "technique"
  };
  try {
    const denied = await app.inject({ method: "POST", url: "/api/sav/cases", headers: { cookie, origin: "https://evil.example.invalid" }, payload: body });
    assert.equal(denied.statusCode, 403);
    const invalid = await app.inject({ method: "POST", url: "/api/sav/cases", headers: { cookie, origin }, payload: { ...body, problem: "" } });
    assert.equal(invalid.statusCode, 400);
    const response = await app.inject({ method: "POST", url: "/api/sav/cases", headers: { cookie, origin }, payload: body });
    assert.equal(response.statusCode, 201);
    assert.equal(response.json().sav_reference, body.savReference);
    assert.equal(response.json().serial_number, body.serialNumber);
    assert.equal(response.json().client_name, body.clientName);
    assert.equal(response.json().client_number, body.clientNumber);
    assert.equal(response.json().problem, body.problem);
    assert.equal(response.json().sav_action, body.savAction);
    assert.equal(response.json().sav_type, body.savType);
    assert.equal(statements.filter(s => s.sql === "BEGIN").length, 1);
    assert.equal(statements.filter(s => s.sql === "COMMIT").length, 1);
    assert.equal(statements.filter(s => s.sql.includes("INSERT INTO audit_events")).length, 1);
  } finally { await app.close(); }
});

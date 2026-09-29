import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { createApp } from "./app.ts";
import { loadBetaAccounts, type InternalRole } from "./beta-auth.ts";
import type { Database } from "./db.ts";

const origin = "https://portal.example.invalid";
const accountDefinitions: { identifier: string; pin: string; role: InternalRole }[] = [
  { identifier: "DEMO-ADMIN", pin: "1111", role: "global_admin" },
  { identifier: "DEMO-MANAGER", pin: "2222", role: "sav_manager" },
  { identifier: "DEMO-TECH", pin: "3333", role: "sav_technician" },
  { identifier: "DEMO-MARKETING", pin: "4444", role: "marketing" },
  { identifier: "DEMO-SALES", pin: "5555", role: "sales" },
  { identifier: "DEMO-ADV", pin: "6666", role: "adv" },
  { identifier: "DEMO-LOGISTICS", pin: "7777", role: "logistics" }
];

function fakeDatabase() {
  const users = new Map<string, { id: string; role: InternalRole; active: boolean }>();
  const sessions = new Map<string, { userId: string; expiresAt: Date }>();
  const db = { query: async (sql: string, values: unknown[] = []) => {
    if (sql.includes("INSERT INTO users")) {
      const [, , identifier, role] = values as [string, string, string, InternalRole];
      const existing = users.get(identifier);
      if (existing && !existing.active) return { rows: [], rowCount: 0 };
      const user = { id: existing?.id ?? values[0] as string, role, active: true };
      users.set(identifier, user);
      return { rows: [{ id: user.id }], rowCount: 1 };
    }
    if (sql.includes("INSERT INTO sessions")) {
      const [hash, expiresAt, userId] = values as [string, Date, string];
      if (![...users.values()].some(user => user.id === userId && user.active)) return { rows: [], rowCount: 0 };
      sessions.set(hash, { userId, expiresAt });
      return { rows: [{ token_hash: hash }], rowCount: 1 };
    }
    if (sql.includes("DELETE FROM sessions")) {
      sessions.delete(values[0] as string);
      return { rows: [], rowCount: 1 };
    }
    if (sql.includes("FROM sessions s")) {
      const session = sessions.get(values[0] as string);
      const user = [...users.values()].find(entry => entry.id === session?.userId && entry.active);
      return { rows: session && session.expiresAt > new Date() && user ? [{
        id: user.id, role: user.role, organization_id: null, organization_kind: null
      }] : [], rowCount: user ? 1 : 0 };
    }
    if (sql.includes("FROM sav_cases ORDER BY")) return { rows: [], rowCount: 0 };
    if (sql.includes("FROM sav_cases WHERE id")) return { rows: [{ id: "20000000-0000-4000-8000-000000000002", client_organization_id: null }], rowCount: 1 };
    if (sql.includes("FROM contracts c")) return { rows: [], rowCount: 0 };
    throw new Error(`Unexpected SQL in authentication test: ${sql}`);
  } } as unknown as Database;
  return { db, users, sessions };
}

const header = (setCookie: string) => setCookie.split(";", 1)[0];
const hash = (cookie: string) => createHash("sha256").update(cookie.split("=")[1]).digest("hex");

async function login(app: ReturnType<typeof createApp>, identifier: string, pin: string, cookie?: string) {
  return app.inject({ method: "POST", url: "/api/login", headers: { origin, ...(cookie ? { cookie } : {}) },
    payload: { identifier, pin } });
}

test("unknown identifier, wrong PIN and cross-origin requests never issue a session", async () => {
  const { db, sessions } = fakeDatabase();
  const app = createApp(db, origin, loadBetaAccounts(JSON.stringify(accountDefinitions)));
  try {
    assert.equal((await login(app, "UNKNOWN", "1111")).statusCode, 401);
    assert.equal((await login(app, "DEMO-ADMIN", "9999")).statusCode, 401);
    assert.equal((await app.inject({ method: "POST", url: "/api/login", payload: accountDefinitions[0] })).statusCode, 403);
    assert.equal((await app.inject({ method: "POST", url: "/api/recipe/session", headers: { origin } })).statusCode, 410);
    assert.equal(sessions.size, 0);
    assert.equal((await app.inject({ method: "GET", url: "/api/session" })).statusCode, 401);
    assert.equal((await app.inject({ method: "GET", url: "/api/sav/cases" })).statusCode, 401);
  } finally { await app.close(); }
});

test("seven server-issued roles have their own SAV and service permissions", async () => {
  const { db } = fakeDatabase();
  const app = createApp(db, origin, loadBetaAccounts(JSON.stringify(accountDefinitions)));
  try {
    for (const account of accountDefinitions) {
      const response = await login(app, account.identifier, account.pin);
      assert.equal(response.statusCode, 200);
      const cookie = header(response.headers["set-cookie"] as string);
      assert.match(response.headers["set-cookie"] as string, /HttpOnly; Secure; SameSite=Lax/);
      assert.equal((await app.inject({ method: "GET", url: "/api/session", headers: { cookie } })).json().role, account.role);
      const list = await app.inject({ method: "GET", url: "/api/sav/cases", headers: { cookie } });
      const detail = await app.inject({ method: "GET", url: "/api/sav/cases/20000000-0000-4000-8000-000000000002", headers: { cookie } });
      const contract = await app.inject({ method: "GET", url: "/api/sav/contracts", headers: { cookie } });
      const savAllowed = ["global_admin", "sav_manager", "sav_technician"].includes(account.role);
      assert.equal(list.statusCode, savAllowed ? 200 : 403);
      assert.equal(detail.statusCode, savAllowed ? 200 : 403);
      assert.equal(contract.statusCode, ["global_admin", "sav_manager", "sav_technician"].includes(account.role) ? 200 : 403);
      if (!savAllowed) {
        const creation = await app.inject({ method: "POST", url: "/api/sav/cases", headers: { cookie, origin }, payload: {
          submissionKey: "40000000-0000-4000-8000-000000000004", savReference: "DEMO-REF",
          serialNumber: "DEMO-SN", clientName: "CLIENT DEMO", clientNumber: "DEMO-CL",
          model: "DEMO", site: "SITE DEMO", problem: "Test fictif", cause: "Cause fictive",
          savAction: "Action fictive", savType: "technique"
        } });
        assert.equal(creation.statusCode, 403);
      }
    }
  } finally { await app.close(); }
});

test("logout revokes the PostgreSQL token, account switch revokes the old cookie, two sessions stay distinct", async () => {
  const { db, sessions } = fakeDatabase();
  const app = createApp(db, origin, loadBetaAccounts(JSON.stringify(accountDefinitions)));
  try {
    const first = header((await login(app, "DEMO-TECH", "3333")).headers["set-cookie"] as string);
    const second = header((await login(app, "DEMO-TECH", "3333")).headers["set-cookie"] as string);
    assert.notEqual(first, second);
    assert.equal(sessions.size, 2);
    const switched = await login(app, "DEMO-MARKETING", "4444", first);
    const marketing = header(switched.headers["set-cookie"] as string);
    assert.equal((await app.inject({ method: "GET", url: "/api/session", headers: { cookie: first } })).statusCode, 401);
    assert.equal((await app.inject({ method: "GET", url: "/api/sav/cases", headers: { cookie: marketing } })).statusCode, 403);
    assert.equal((await app.inject({ method: "GET", url: "/api/sav/cases", headers: { cookie: second } })).statusCode, 200);
    const logout = await app.inject({ method: "POST", url: "/api/logout", headers: { origin, cookie: second } });
    assert.equal(logout.statusCode, 204);
    assert.match(logout.headers["set-cookie"] as string, /Max-Age=0/);
    assert.equal((await app.inject({ method: "GET", url: "/api/sav/cases", headers: { cookie: second } })).statusCode, 401);
    assert.equal(sessions.size, 1);
    sessions.get(hash(marketing))!.expiresAt = new Date(0);
    assert.equal((await app.inject({ method: "GET", url: "/api/session", headers: { cookie: marketing } })).statusCode, 401);
  } finally { await app.close(); }
});

test("storage/header forgery has no server authority; inactive users and repeated failures are denied", async () => {
  const { db, users } = fakeDatabase();
  const app = createApp(db, origin, loadBetaAccounts(JSON.stringify(accountDefinitions)));
  try {
    assert.equal((await app.inject({ method: "GET", url: "/api/sav/cases",
      headers: { "x-sessionstorage": '{"role":"global_admin","isAuthenticated":true}' } })).statusCode, 401);
    const logged = await login(app, "DEMO-ADMIN", "1111");
    const cookie = header(logged.headers["set-cookie"] as string);
    users.get("DEMO-ADMIN")!.active = false;
    assert.equal((await app.inject({ method: "GET", url: "/api/session", headers: { cookie } })).statusCode, 401);
    assert.equal((await login(app, "DEMO-ADMIN", "1111")).statusCode, 401);
    for (let attempt = 0; attempt < 5; attempt++)
      assert.equal((await login(app, "DEMO-TECH", "9999")).statusCode, 401);
    assert.equal((await login(app, "DEMO-TECH", "3333")).statusCode, 429);
  } finally { await app.close(); }
});

test("beta config rejects missing, duplicate or external roles", () => {
  assert.throws(() => loadBetaAccounts(undefined));
  assert.throws(() => loadBetaAccounts(JSON.stringify([...accountDefinitions, accountDefinitions[0]])));
  assert.throws(() => loadBetaAccounts(JSON.stringify([{ identifier: "CLIENT", pin: "1234", role: "client" }])));
});

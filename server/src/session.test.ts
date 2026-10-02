import assert from "node:assert/strict";
import { test } from "node:test";
import type { Database } from "./db.ts";
import { findPrincipal, readSessionToken, sessionSetCookie, sessionClearCookie, revokeLegacySessions } from "./session.ts";

test("session cookies reject malformed tokens", () => {
  assert.equal(readSessionToken(undefined), null);
  assert.equal(readSessionToken("obera_session=demo"), null);
  assert.equal(readSessionToken(`other=1; obera_session=${"a".repeat(64)}`), "a".repeat(64));
});

test("retired sessions have no principal and startup revokes only their tokens", async () => {
  const rows = [{ id: "legacy", role: "reseller", organization_id: "reseller-a", organization_kind: "reseller" }];
  const queries: string[] = [];
  const db = { query: async (sql: string) => { queries.push(sql); return { rows }; } } as unknown as Database;
  assert.equal(await findPrincipal(db, `obera_session=${"a".repeat(64)}`), null);
  for (const retired of ["marketing", "sales", "adv", "logistics"] as const) {
    rows[0].role = retired;
    assert.equal(await findPrincipal(db, `obera_session=${"a".repeat(64)}`), null);
  }
  await revokeLegacySessions(db);
  assert.match(queries.at(-1)!, /DELETE FROM sessions s USING users u/);
  assert.match(queries.at(-1)!, /u\.role NOT IN/);
  assert.match(queries.at(-1)!, /'commercial'/);
  assert.doesNotMatch(queries.at(-1)!, /DELETE FROM users|DELETE FROM portal_requests|DELETE FROM documents/);
});

test("session cookie is inaccessible to browser scripts and scoped to HTTPS", () => {
  const cookie = sessionSetCookie("a".repeat(64));
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(sessionClearCookie(), /Max-Age=0/);
  assert.doesNotMatch(sessionSetCookie("a".repeat(64), false), /Secure/);
});

test("external session requires exactly one organization of the matching kind", async () => {
  const rows = [
    { id: "fictional-id", role: "client", organization_id: "client-a", organization_kind: "client" },
    { id: "fictional-id", role: "client", organization_id: "client-b", organization_kind: "client" }
  ];
  const db = { query: async () => ({ rows }) } as unknown as Database;
  assert.equal(await findPrincipal(db, `obera_session=${"a".repeat(64)}`), null);
  rows.pop();
  assert.deepEqual(await findPrincipal(db, `obera_session=${"a".repeat(64)}`), {
    userId: "fictional-id", role: "client", organizationIds: ["client-a"]
  });
  rows.push({ id: "fictional-id", role: "client", organization_id: "reseller-a", organization_kind: "reseller" });
  rows[1].organization_kind = "reseller";
  assert.equal(await findPrincipal(db, `obera_session=${"a".repeat(64)}`), null);
});

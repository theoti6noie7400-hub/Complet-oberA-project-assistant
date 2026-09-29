import assert from "node:assert/strict";
import { test } from "node:test";
import type { Database } from "./db.ts";
import { findPrincipal, readSessionToken, sessionSetCookie, sessionClearCookie } from "./session.ts";

test("session cookies reject malformed tokens", () => {
  assert.equal(readSessionToken(undefined), null);
  assert.equal(readSessionToken("obera_session=demo"), null);
  assert.equal(readSessionToken(`other=1; obera_session=${"a".repeat(64)}`), "a".repeat(64));
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

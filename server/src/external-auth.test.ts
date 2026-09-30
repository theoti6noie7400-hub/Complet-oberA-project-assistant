import assert from "node:assert/strict";
import { test } from "node:test";
import { loadExternalAccounts, verifyExternalAccount } from "./external-auth.ts";

const org = "a1000000-0000-4000-8000-000000000001";
const definitions = [
  { identifier: "DEMO-CLIENT-A", pin: "8211", role: "client", organizationId: org },
  { identifier: "DEMO-RESELLER-A", pin: "8322", role: "reseller", organizationId: org }
];

test("external configuration accepts only scoped identities and hashes PINs", () => {
  const accounts = loadExternalAccounts(JSON.stringify(definitions));
  assert.equal(accounts.length, 1);
  assert.equal(JSON.stringify(accounts).includes("8211"), false);
  assert.equal(verifyExternalAccount(accounts, "demo-client-a", "8211", "client")?.organizationId, org);
  assert.equal(verifyExternalAccount(accounts, "DEMO-CLIENT-A", "8211", "reseller"), null);
  assert.equal(verifyExternalAccount(accounts, "DEMO-RESELLER-A", "8322", "reseller"), null);
  assert.equal(verifyExternalAccount(accounts, "DEMO-CLIENT-A", "0000", "client"), null);
  assert.throws(() => loadExternalAccounts(undefined));
  assert.throws(() => loadExternalAccounts(JSON.stringify([...definitions, definitions[0]])));
  assert.throws(() => loadExternalAccounts(JSON.stringify([{ ...definitions[0], role: "global_admin" }])));
  assert.throws(() => loadExternalAccounts(JSON.stringify([{ ...definitions[0], organizationId: "" }])));
  assert.throws(() => loadExternalAccounts(JSON.stringify([definitions[1]])));
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { can, canEnterService, type Principal } from "./access.ts";

const person = (role: Principal["role"], ...organizationIds: string[]): Principal =>
  ({ userId: "fictional-user", role, organizationIds });

test("SAV staff sees all SAV cases, other services are denied by default", () => {
  const caseA = { kind: "sav_case" as const, clientOrganizationId: "client-a" };
  for (const role of ["sav_manager", "sav_technician", "global_admin"] as const) {
    assert.equal(can(person(role), "read", caseA), true);
  }
  for (const role of ["commercial", "adv", "logistics", "marketing", "client", "reseller"] as const) {
    assert.equal(can(person(role, "client-a"), "read", caseA), false);
  }
  assert.equal(can(person("sav_technician"), "manage", caseA), false);
  assert.equal(can(person("sav_technician"), "update", caseA), false);
  assert.equal(can(person("sav_technician"), "update_technical", caseA), true);
  assert.equal(can(person("sav_manager"), "manage", caseA), true);
});

test("client and reseller requests are isolated by organization and type", () => {
  const clientRequest = { kind: "client_request" as const, organizationId: "client-a" };
  const resellerRequest = { kind: "reseller_request" as const, organizationId: "reseller-a" };
  assert.equal(can(person("client", "client-a"), "read", clientRequest), true);
  assert.equal(can(person("client", "client-b"), "read", clientRequest), false);
  assert.equal(can(person("client", "client-a", "client-b"), "read", clientRequest), true);
  assert.equal(can(person("client", "reseller-a"), "read", resellerRequest), false);
  assert.equal(can(person("reseller", "reseller-a"), "read", resellerRequest), true);
  assert.equal(can(person("reseller", "reseller-b"), "read", resellerRequest), false);
  assert.equal(can(person("reseller", "client-a"), "read", clientRequest), false);
});

test("documents require explicit audience and the matching organization", () => {
  const internal = { kind: "document" as const, audience: "internal" as const, organizationId: "client-a" };
  const shared = { kind: "document" as const, audience: "client" as const, organizationId: "client-a" };
  assert.equal(can(person("client", "client-a"), "read", internal), false);
  assert.equal(can(person("client", "client-a"), "read", shared), true);
  assert.equal(can(person("client", "client-b"), "read", shared), false);
  assert.equal(can(person("reseller", "client-a"), "read", shared), false);
  assert.equal(can(person("marketing"), "read", internal), false);
});

test("service hubs are scoped; unknown hubs are denied", () => {
  assert.equal(canEnterService(person("sav_technician"), "sav-maintenance"), true);
  assert.equal(canEnterService(person("marketing"), "sav-maintenance"), false);
  assert.equal(canEnterService(person("marketing"), "marketing"), true);
  assert.equal(canEnterService(person("commercial"), "marketing"), false);
  assert.equal(canEnterService(person("client"), "unknown"), false);
});

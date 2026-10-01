import assert from "node:assert/strict";
import { test } from "node:test";
import { PRODUCTS } from "../../src/lib/assistantData.ts";
import { CLIENT_NOTICE_SOURCES } from "./client-notice-manifest.ts";

test("notice mapping is exact and only uses catalog model names and approved sharing", () => {
  const catalog = new Set(PRODUCTS.map(product => product.name));
  const models = new Set<string>();
  for (const source of CLIENT_NOTICE_SOURCES) {
    assert.match(source.file, /\.pdf$/i);
    assert.match(source.sha256, /^[a-f0-9]{64}$/);
    for (const model of source.models) {
      assert.ok(catalog.has(model), model);
      assert.ok(!models.has(model), `Duplicate mapping: ${model}`);
      models.add(model);
    }
  }
  assert.equal(CLIENT_NOTICE_SOURCES.length, 26);
  assert.equal(models.size, 32);
  assert.deepEqual(CLIENT_NOTICE_SOURCES.find(item => item.models.includes("IC 22")), {
    file: "FR  NOTICE TECHNIQUE IC-22 .pdf",
    sha256: "7094fc327de8ae5d1284e9310671ebf13c9046543aa50fa7ccaa78f7f49b4d9a", models: ["IC 22"] });
  assert.deepEqual(CLIENT_NOTICE_SOURCES.find(item => item.models.includes("DUSTOMAT 4-24")), {
    file: "FR  NOTICE DUSTOMAT 4.pdf",
    sha256: "692f4ce289474722c55d349a023602fb16d8700ddb98d9b463ab14195a79dacc", models: ["DUSTOMAT 4-24"] });
  for (const unverified of ["DUSTOMAT 4-10",
    "ECOCLIM 20", "ePUR EX 2000", "ePUR 150", "ePURFresh 150"]) assert.ok(!models.has(unverified), unverified);
  for (const [left, right] of [["ePURBox", "ePURBox ATEX"], ["DUSTMAC", "DUSTMAC ATEX"],
    ["Dustomat HYDRO", "DUSTOMAT HYDRO ATEX"],
    ["ePUR EX 1000", "ePUR EX 1001"], ["ePUR EX 3000", "ePUR EX 3001"],
    ["ePUR EX 5000", "ePUR EX 5001"]]) {
    const primary = CLIENT_NOTICE_SOURCES.find(item => item.models.includes(left));
    assert.ok(primary?.models.includes(right), `${left} and ${right}`);
  }
  const dustmac = CLIENT_NOTICE_SOURCES.find(item => item.models.includes("DUSTMAC"));
  assert.equal(dustmac?.file, "FR - Notice Dustomat P-90.pdf");
  assert.equal(dustmac?.sha256, "6d4784fcb47593f1aa615f504181a6c1e632a3dbe35b2d8a6295f879e5b3bbd0");
});

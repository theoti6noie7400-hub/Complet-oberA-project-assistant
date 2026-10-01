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
  assert.equal(CLIENT_NOTICE_SOURCES.length, 25);
  assert.equal(models.size, 30);
  for (const unverified of ["DUSTOMAT 4-24", "DUSTOMAT 4-10", "DUSTMAC", "DUSTMAC ATEX",
    "ECOCLIM 20", "ePUR EX 2000", "ePUR 150"]) assert.ok(!models.has(unverified), unverified);
  for (const [left, right] of [["ePURBox", "ePURBox ATEX"],
    ["Dustomat HYDRO", "DUSTOMAT HYDRO ATEX"],
    ["ePUR EX 1000", "ePUR EX 1001"], ["ePUR EX 3000", "ePUR EX 3001"],
    ["ePUR EX 5000", "ePUR EX 5001"]]) {
    const primary = CLIENT_NOTICE_SOURCES.find(item => item.models.includes(left));
    assert.ok(primary?.models.includes(right), `${left} and ${right}`);
  }
});

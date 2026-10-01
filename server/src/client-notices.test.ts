import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { noticeAvailable, verifiedNotice } from "./client-notices.ts";

test("private notice resolution checks the fixed storage key, root and digest", async () => {
  const root = await mkdtemp(join(tmpdir(), "obera-notice-demo-"));
  const outside = await mkdtemp(join(tmpdir(), "obera-notice-outside-"));
  try {
    const data = Buffer.from("%PDF-1.4\n% DEMO TEST NOTICE\n%%EOF\n");
    const sha256 = createHash("sha256").update(data).digest("hex");
    const asset = { sha256, storage_key: `client-notices/${sha256}.pdf`, size_bytes: data.length };
    await mkdir(join(root, "client-notices"));
    assert.equal(await noticeAvailable(root, asset), false);
    await writeFile(join(root, asset.storage_key), data);
    assert.equal(await noticeAvailable(root, asset), true);
    assert.deepEqual(await verifiedNotice(root, asset), data);
    assert.equal(await verifiedNotice(root, { ...asset, storage_key: `../${sha256}.pdf` }), null);
    assert.equal(await verifiedNotice(root, { ...asset, sha256: "0".repeat(64) }), null);
    await writeFile(join(root, asset.storage_key), Buffer.from("%PDF-1.4\n% NOT THE SAME DATA\n"));
    assert.equal(await verifiedNotice(root, asset), null);
    await rm(join(root, asset.storage_key));
    await writeFile(join(outside, "outside.pdf"), data);
    await symlink(join(outside, "outside.pdf"), join(root, asset.storage_key));
    assert.equal(await verifiedNotice(root, asset), null);
  } finally { await rm(root, { recursive: true, force: true }); await rm(outside, { recursive: true, force: true }); }
});

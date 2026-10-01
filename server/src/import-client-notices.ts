import { createHash } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { openDatabase } from "./db.ts";
import { CLIENT_NOTICE_SOURCES } from "./client-notice-manifest.ts";

// Run only with an explicitly supplied private folder containing the extracted
// reference ZIP. No PDF is built into the app or exposed under public/.
const source = process.env.CLIENT_NOTICE_SOURCE_DIR;
const root = process.env.PRIVATE_DOCUMENT_ROOT;
if (!source || !root || !process.env.DATABASE_URL)
  throw new Error("CLIENT_NOTICE_SOURCE_DIR, PRIVATE_DOCUMENT_ROOT and DATABASE_URL are required");

const files: { file: string; sha256: string; models: readonly string[]; data: Buffer }[] = [];
for (const item of CLIENT_NOTICE_SOURCES) {
  const data = await readFile(join(resolve(source), item.file));
  if (data.length > 25 * 1024 * 1024 || !data.subarray(0, 5).equals(Buffer.from("%PDF-")) ||
      createHash("sha256").update(data).digest("hex") !== item.sha256)
    throw new Error(`Notice source mismatch: ${item.file}`);
  files.push({ ...item, data });
}

const db = openDatabase();
const client = await db.connect();
try {
  await client.query("BEGIN");
  await mkdir(join(root, "client-notices"), { recursive: true, mode: 0o700 });
  for (const item of files) {
    const key = `client-notices/${item.sha256}.pdf`;
    await writeFile(join(root, key), item.data, { mode: 0o600 });
    await chmod(join(root, key), 0o600);
    await client.query(`INSERT INTO client_notice_assets (sha256, storage_key, source_name, size_bytes)
      VALUES ($1,$2,$3,$4) ON CONFLICT (sha256) DO NOTHING`,
    [item.sha256, key, item.file, item.data.length]);
    for (const model of item.models) {
      await client.query(`INSERT INTO client_model_notices (model, asset_sha256)
        VALUES ($1,$2) ON CONFLICT (model) DO NOTHING`, [model, item.sha256]);
      const current = await client.query("SELECT asset_sha256 FROM client_model_notices WHERE model=$1", [model]);
      if (current.rows[0]?.asset_sha256 !== item.sha256)
        throw new Error(`Conflicting existing notice mapping for ${model}`);
    }
  }
  await client.query("COMMIT");
  process.stdout.write(`Imported ${files.length} verified PDFs for ${files.flatMap(file => file.models).length} exact models\n`);
} catch (error) { await client.query("ROLLBACK"); throw error; }
finally { client.release(); await db.end(); }

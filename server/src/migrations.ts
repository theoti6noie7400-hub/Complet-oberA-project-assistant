import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import type { PoolClient } from "pg";

const directory = new URL("../migrations/", import.meta.url);

export async function migrationFiles(): Promise<string[]> {
  return (await readdir(directory)).filter(name => /^\d+_.*\.sql$/.test(name)).sort();
}

// `through` is used only by the migration recipe to reproduce a populated
// database at a published schema boundary. Production always applies all files.
export async function applyMigrations(client: PoolClient, through?: string): Promise<string[]> {
  const files = await migrationFiles();
  if (through && !files.includes(through)) throw new Error(`Unknown migration: ${through}`);
  const selected = through ? files.slice(0, files.indexOf(through) + 1) : files;
  const applied: string[] = [];
  await client.query("BEGIN");
  try {
    await client.query("SELECT pg_advisory_xact_lock(18732511)");
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    for (const name of selected) {
      const sql = await readFile(new URL(name, directory), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const existing = await client.query("SELECT checksum FROM schema_migrations WHERE name = $1", [name]);
      if (existing.rows.length) {
        if (existing.rows[0].checksum !== checksum) throw new Error(`Migration changed: ${name}`);
        continue;
      }
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)", [name, checksum]);
      applied.push(name);
    }
    await client.query("COMMIT");
    return applied;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

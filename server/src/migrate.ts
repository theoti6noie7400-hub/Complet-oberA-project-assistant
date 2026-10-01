import { openDatabase } from "./db.ts";
import { applyMigrations } from "./migrations.ts";

const pool = openDatabase();
const client = await pool.connect();

try {
  for (const name of await applyMigrations(client)) process.stdout.write(`Applied ${name}\n`);
} finally {
  client.release();
  await pool.end();
}

import { openDatabase } from "./db.ts";

if (process.env.RECIPE_MODE !== "1" || !process.env.DATABASE_URL ||
  new URL(process.env.DATABASE_URL).pathname !== "/obera_recipe") {
  throw new Error("Only the local fictional obera_recipe database can be seeded");
}

const db = openDatabase();
try {
  await db.query(`INSERT INTO users (id, identity_issuer, identity_subject, role)
    VALUES ($1, $2, $3, 'sav_technician') ON CONFLICT (id) DO NOTHING`,
  ["30000000-0000-4000-8000-000000000003", "https://identity.example.invalid", "technicien-fictif"]);
  process.stdout.write("Fictional SAV technician ready\n");
} finally {
  await db.end();
}

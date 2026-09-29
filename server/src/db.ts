import pg from "pg";

const { Pool } = pg;

export function openDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");
  return new Pool({ connectionString, max: 10 });
}

export type Database = ReturnType<typeof openDatabase>;

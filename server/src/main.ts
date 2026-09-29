import { createApp } from "./app.ts";
import { loadBetaAccounts } from "./beta-auth.ts";
import { loadExternalAccounts } from "./external-auth.ts";
import { openDatabase } from "./db.ts";

const origin = process.env.PUBLIC_ORIGIN;
const recipeMode = process.env.RECIPE_MODE === "1";
const databaseUrl = process.env.DATABASE_URL;
const accounts = loadBetaAccounts(process.env.BETA_INTERNAL_ACCOUNTS);
const externalAccounts = loadExternalAccounts(process.env.BETA_EXTERNAL_ACCOUNTS);
if (recipeMode) {
  if (!databaseUrl || new URL(databaseUrl).pathname !== "/obera_recipe" ||
    !["http://localhost:5173", "http://127.0.0.1:5173"].includes(origin ?? ""))
    throw new Error("Recipe mode requires the local obera_recipe database and Vite origin");
} else if (!origin || !origin.startsWith("https://")) {
  throw new Error("PUBLIC_ORIGIN must be HTTPS");
}
const db = openDatabase();
const app = createApp(db, origin!, accounts, externalAccounts);
try {
  await app.listen({ port: Number(process.env.PORT || "3000"), host: process.env.BIND_HOST || "127.0.0.1" });
} catch (error) {
  await db.end();
  throw error;
}

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => { void app.close().then(() => db.end()); });
}

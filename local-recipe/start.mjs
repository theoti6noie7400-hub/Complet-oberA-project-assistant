import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createLocalRecipeApi } from "./api.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (Number(process.versions.node.split(".")[0]) !== 24) {
  console.error("La recette locale nécessite Node.js 24 portable.");
  process.exit(1);
}
if (!existsSync(join(root, "node_modules", "vite"))) {
  console.log("Premier démarrage : installation locale des dépendances du dépôt (npm ci)…");
  const npmCli = process.env.npm_execpath || join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
  const installed = spawnSync(process.execPath, [npmCli, "ci"], { cwd: root, stdio: "inherit" });
  if (installed.status !== 0) process.exit(installed.status || 1);
}

// Only this launcher enables the flag. A normal dev/build process does not
// load the local API, accounts or fixture state.
process.env.VITE_LOCAL_RECIPE = "1";
const { createServer } = await import("vite");
const api = createLocalRecipeApi(join(root, ".local-recipe", "data.json"));
const server = await createServer({ root, base: "/", server: { host: "127.0.0.1", port: 5173,
  strictPort: true, proxy: {} }, plugins: [{ name: "obera-local-recipe-only",
  configureServer(vite) { vite.middlewares.use(api); } }] });
try {
  await server.listen();
  console.log("\nMODE RECETTE LOCALE — DONNÉES FICTIVES");
  console.log("Ouvrir dans Edge : http://127.0.0.1:5173/");
  console.log("Arrêter avec Ctrl+C. Les demandes DEMO restent enregistrées localement jusqu'à réinitialisation.\n");
} catch (error) {
  console.error("Impossible d'ouvrir le port 5173. Fermez l'ancien portail puis relancez npm.cmd run recette.", error);
  process.exitCode = 1;
  await server.close();
}

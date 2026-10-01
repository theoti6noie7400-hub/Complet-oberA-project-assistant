import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { importPrivateClients, LOCAL_CLIENT_FILE } from "./private-clients.mjs";

const source = resolve(process.argv[2] ?? join(homedir(), "Downloads", "obera-clients-recette.json"));
try {
  const result = await importPrivateClients(source);
  console.log(`${result.clients} comptes et ${result.devices} appareils importés dans ${LOCAL_CLIENT_FILE}`);
  console.log("Relancez npm.cmd run recette puis reconnectez-vous. Réinitialiser les données DEMO conserve ces comptes.");
} catch (error) {
  console.error(`Import interrompu : ${error.message}`);
  console.error(`Placez obera-clients-recette.json dans Téléchargements ou indiquez son chemin : npm.cmd run recette:import-clients -- "C:\\chemin\\vers\\fichier.json"`);
  process.exitCode = 1;
}

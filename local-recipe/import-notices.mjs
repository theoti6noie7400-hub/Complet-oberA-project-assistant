import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { importAvailableLocalNotices, LOCAL_NOTICE_ROOT, LOCAL_NOTICE_SOURCES } from "./notices.mjs";

const source = resolve(process.argv[2] ?? join(homedir(), "Downloads"));
try {
  const { count, models } = await importAvailableLocalNotices(source);
  console.log(`${count} notices OberA vérifiées et copiées dans le stockage privé : ${LOCAL_NOTICE_ROOT}`);
  console.log(`Modèles importés : ${models.join(", ")}`);
  console.log("Relancez npm.cmd run recette, puis reconnectez-vous dans Edge.");
} catch (error) {
  console.error(`Import interrompu. Placez les PDF d'origine dans ${source} avec leurs noms exacts :`);
  for (const item of LOCAL_NOTICE_SOURCES) console.error(`- ${item.file}`);
  console.error(`Détail : ${error.message}`);
  process.exitCode = 1;
}

import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { LOCAL_NOTICE_ROOT } from "./notices.mjs";
import { PUMP_PROTOCOL_KEY, PUMP_PROTOCOL_SHA256 } from "../server/src/pump-protocol.ts";

const source = process.argv[2];
if (!source) {
  console.error('Indiquez le chemin du PDF : npm.cmd run recette:import-pompe -- "C:\\chemin\\PROTOCOLE POMPE IC22 12.pdf"');
  process.exitCode = 1;
} else {
  try {
    const data = await readFile(resolve(source));
    if (!data.subarray(0, 5).equals(Buffer.from("%PDF-")) ||
        createHash("sha256").update(data).digest("hex") !== PUMP_PROTOCOL_SHA256)
      throw new Error("Ce PDF n’est pas le protocole OberA validé (SHA-256 différent).");
    const destination = join(LOCAL_NOTICE_ROOT, PUMP_PROTOCOL_KEY);
    await mkdir(dirname(destination), { recursive: true, mode: 0o700 });
    const temporary = `${destination}.${process.pid}.tmp`;
    await writeFile(temporary, data, { mode: 0o600 });
    await rename(temporary, destination);
    console.log(`Protocole vérifié et importé dans le stockage privé : ${destination}`);
  } catch (error) {
    console.error(`Import interrompu : ${error.message}`);
    process.exitCode = 1;
  }
}

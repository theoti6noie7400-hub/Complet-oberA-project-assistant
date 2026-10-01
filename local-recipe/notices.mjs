import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { CLIENT_NOTICE_SOURCES } from "../server/src/client-notice-manifest.ts";
import { verifiedNotice } from "../server/src/client-notices.ts";

// Outside the Vite project root and outside Git. The PDFs are never public assets.
export const LOCAL_NOTICE_ROOT = join(homedir(), ".obera-local-recipe", "private-documents");
const models = ["IC 22", "DUSTOMAT 4-24", "IC 12", "ePUR EX 1000", "Clearbox"];
export const LOCAL_NOTICE_SOURCES = models.map(model => {
  const source = CLIENT_NOTICE_SOURCES.find(item => item.models.includes(model));
  if (!source) throw new Error(`Notice validée manquante : ${model}`);
  return { model, file: source.file, sha256: source.sha256 };
});

export async function importLocalNotices(sourceDir, root = LOCAL_NOTICE_ROOT, sources = LOCAL_NOTICE_SOURCES) {
  // Validate the entire batch before writing anything into the private store.
  const ready = await Promise.all(sources.map(async source => {
    const data = await readFile(join(sourceDir, source.file));
    if (!data.subarray(0, 5).equals(Buffer.from("%PDF-")) || data.length > 25 * 1024 * 1024 ||
        createHash("sha256").update(data).digest("hex") !== source.sha256)
      throw new Error(`PDF absent, incorrect ou modifié : ${source.file}`);
    return { ...source, data };
  }));
  const folder = join(root, "client-notices");
  await mkdir(folder, { recursive: true, mode: 0o700 });
  for (const item of ready) {
    const destination = join(folder, `${item.sha256}.pdf`);
    const temporary = `${destination}.${process.pid}.tmp`;
    await writeFile(temporary, item.data, { mode: 0o600 });
    await rename(temporary, destination);
  }
  return ready.length;
}

export async function importAvailableLocalNotices(sourceDir, root = LOCAL_NOTICE_ROOT,
  sources = LOCAL_NOTICE_SOURCES) {
  const available = new Set(await readdir(sourceDir));
  const selected = sources.filter(item => available.has(item.file));
  if (!selected.length) throw new Error("Aucun des PDF autorisés n'a été trouvé");
  return { count: await importLocalNotices(sourceDir, root, selected), models: selected.map(item => item.model) };
}

export async function localNotice(root, model, sources = LOCAL_NOTICE_SOURCES) {
  const source = sources.find(item => item.model === model);
  if (!source) return null;
  const storage_key = `client-notices/${source.sha256}.pdf`;
  try {
    const info = await stat(join(root, storage_key));
    return await verifiedNotice(root, { storage_key, sha256: source.sha256, size_bytes: info.size });
  } catch { return null; }
}

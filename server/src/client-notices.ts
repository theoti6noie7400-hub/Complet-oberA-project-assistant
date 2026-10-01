import { createHash } from "node:crypto";
import { readFile, realpath, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

export type NoticeAsset = { storage_key: string; sha256: string; size_bytes: number };
const keyFormat = /^client-notices\/[a-f0-9]{64}\.pdf$/;
const maxSize = 25 * 1024 * 1024;

async function pathFor(root: string | undefined, asset: NoticeAsset) {
  if (!root || !keyFormat.test(asset.storage_key) ||
    asset.storage_key !== `client-notices/${asset.sha256}.pdf`) return null;
  try {
    const realRoot = await realpath(root);
    const file = await realpath(resolve(realRoot, asset.storage_key));
    const inside = relative(realRoot, file);
    if (!inside || inside.startsWith("..") || isAbsolute(inside)) return null;
    const info = await stat(file);
    return info.isFile() && info.size === asset.size_bytes && info.size <= maxSize ? file : null;
  } catch { return null; }
}

export async function noticeAvailable(root: string | undefined, asset: NoticeAsset | null) {
  return asset ? Boolean(await pathFor(root, asset)) : false;
}

export async function verifiedNotice(root: string | undefined, asset: NoticeAsset) {
  const path = await pathFor(root, asset);
  if (!path) return null;
  try {
    const data = await readFile(path);
    if (!data.subarray(0, 5).equals(Buffer.from("%PDF-"))) return null;
    return createHash("sha256").update(data).digest("hex") === asset.sha256 ? data : null;
  } catch { return null; }
}

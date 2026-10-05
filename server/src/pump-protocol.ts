import { createHash } from "node:crypto";
import { readFile, realpath, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

// OberA-supplied, validated for the IC22/KM22/VL220 chassis. The PDF itself
// lives only in PRIVATE_DOCUMENT_ROOT, never in public/ or the Vite bundle.
export const PUMP_PROTOCOL_SHA256 = "689d8a6e37908bdb073cbbcb689445a6eee3870772dd3fa99e5db9eb0005df00";
export const PUMP_PROTOCOL_KEY = `protocols/${PUMP_PROTOCOL_SHA256}.pdf`;

async function privatePath(root: string | undefined) {
  if (!root) return null;
  try {
    const realRoot = await realpath(root);
    const file = await realpath(resolve(realRoot, PUMP_PROTOCOL_KEY));
    const inside = relative(realRoot, file);
    if (!inside || inside.startsWith("..") || isAbsolute(inside)) return null;
    const info = await stat(file);
    return info.isFile() && info.size > 5 && info.size <= 25 * 1024 * 1024 ? file : null;
  } catch { return null; }
}

export async function verifiedPumpProtocol(root: string | undefined) {
  const path = await privatePath(root);
  if (!path) return null;
  try {
    const data = await readFile(path);
    return data.subarray(0, 5).equals(Buffer.from("%PDF-")) &&
      createHash("sha256").update(data).digest("hex") === PUMP_PROTOCOL_SHA256 ? data : null;
  } catch { return null; }
}

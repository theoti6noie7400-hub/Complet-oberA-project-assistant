import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { PRODUCTS } from "../src/lib/assistantData.ts";

// This file is loaded only by the explicit loopback-only local recipe launcher.
export const LOCAL_CLIENT_FILE = join(homedir(), ".obera-local-recipe", "private-data", "clients.json");
const models = new Set(PRODUCTS.map(product => product.name));
const keysAre = (value, keys) => value && typeof value === "object" && !Array.isArray(value) &&
  Object.keys(value).sort().join("|") === [...keys].sort().join("|");
const uuidFor = (...parts) => {
  const bytes = createHash("sha256").update(JSON.stringify(["obera-local-recipe", ...parts])).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

export function validateClientSource(source) {
  if (!keysAre(source, ["version", "clients"]) || source.version !== 1 ||
      !Array.isArray(source.clients) || !source.clients.length || source.clients.length > 10)
    throw new Error("Format des comptes locaux invalide");
  const identifiers = new Set(), serials = new Set();
  for (const client of source.clients) {
    if (!keysAre(client, ["identifier", "pin", "organizationName", "devices"]) ||
        typeof client.identifier !== "string" || !/^[A-Z0-9-]{2,40}$/.test(client.identifier) ||
        client.identifier.startsWith("DEMO-") || identifiers.has(client.identifier) ||
        typeof client.pin !== "string" || !/^\d{4,12}$/.test(client.pin) ||
        typeof client.organizationName !== "string" || !client.organizationName.trim() ||
        client.organizationName.length > 100 || !Array.isArray(client.devices) ||
        !client.devices.length || client.devices.length > 100)
      throw new Error("Compte local invalide ou identifiant réservé");
    identifiers.add(client.identifier);
    for (const device of client.devices) {
      if (!keysAre(device, ["model", "serial"]) || !models.has(device.model) ||
          typeof device.serial !== "string" || !device.serial.trim() ||
          device.serial.length > 80 || device.serial !== device.serial.trim() ||
          serials.has(device.serial))
        throw new Error("Appareil, modèle ou numéro de série invalide ou dupliqué");
      serials.add(device.serial);
    }
  }
  return source;
}

export async function importPrivateClients(sourcePath, target = LOCAL_CLIENT_FILE) {
  const source = validateClientSource(JSON.parse(await readFile(sourcePath, "utf8")));
  const clients = source.clients.map(client => {
    const pinSalt = randomBytes(16).toString("hex");
    const organizationId = uuidFor("organization", client.identifier);
    return { identifier: client.identifier, organizationName: client.organizationName,
      organizationId, pinSalt, pinHash: scryptSync(client.pin, pinSalt, 32).toString("hex"),
      devices: client.devices.map(device => ({ id: uuidFor("device", client.identifier, device.model, device.serial),
        organizationId, model: device.model, serial: device.serial })) };
  });
  await mkdir(dirname(target), { recursive: true, mode: 0o700 });
  const tmp = `${target}.${randomBytes(8).toString("hex")}.tmp`;
  await writeFile(tmp, JSON.stringify({ version: 1, clients }), { mode: 0o600 });
  await rename(tmp, target);
  return { clients: clients.length, devices: clients.reduce((count, client) => count + client.devices.length, 0) };
}

export async function loadPrivateClients(path = LOCAL_CLIENT_FILE) {
  try {
    const parsed = JSON.parse(await readFile(path, "utf8"));
    if (parsed.version !== 1 || !Array.isArray(parsed.clients)) throw new Error("Données privées invalides");
    return parsed.clients;
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

export function checkPrivatePin(account, pin) {
  if (typeof pin !== "string") return false;
  const expected = Buffer.from(account.pinHash, "hex");
  return expected.length === 32 && timingSafeEqual(scryptSync(pin, account.pinSalt, 32), expected);
}

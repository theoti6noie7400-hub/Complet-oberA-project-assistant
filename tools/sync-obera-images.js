/* eslint-disable no-console */
import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

const fsp = fs.promises;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = "https://obera.fr/produits/";
const ROOT_DIR = process.cwd();
const OUTPUT_DIR = path.join(ROOT_DIR, "public", "assets", "obera-products");
const MAPPING_FILE = path.join(ROOT_DIR, "src", "assets", "oberaProductImages.ts");
const SOURCE_FILE = path.join(ROOT_DIR, "src", "lib", "assistantData.ts");
const REQUEST_DELAY_MS = 450;
const USER_AGENT = "OberA-Assistant-ImageSync/1.0";

const OVERRIDES = {
  epur150fresh: ["fresh"],
  purificateurrafraichisseurepur150fresh: ["fresh"],
  aspirationfumeessoudagelaserepurbex: [
    "epur-ex",
    "epur-ex-1000",
    "epur-ex-2000",
    "epur-ex-1001",
    "epur-ex-3000",
    "epur-ex-3001",
    "epur-ex-5000",
    "epur-ex-5001"
  ],
  jumbo: ["jumbo"],
  extracteurdepoussieredustomatdry: ["dustomat-dry", "dustomat-dry-atex"],
  aspirationpoussieredustomat10: ["dustomat-10"],
  extracteurpoussierepulverulentedustomat16m: ["dustomat-16m"],
  depoussiereuravoiehumidedustomathydro: ["dustomat-hydro", "dustomat-hydro-atex"],
  aspirationcentraliseeindustrielledustmac: ["dustmac", "dustmac-atex"],
  tableautonome: ["table-aspirante"],
  tableaspiranteaat: ["table-aspirante"],
  tableaspirantesautonomes: ["table-aspirante"]
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalize(raw) {
  return String(raw || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function decodeHtml(str) {
  return String(str || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&ldquo;/g, "\"")
    .replace(/&rdquo;/g, "\"")
    .replace(/&ndash;/g, "-")
    .replace(/&mdash;/g, "-")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/&#([0-9]+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
}

function fetchText(url, depth = 0) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { headers: { "User-Agent": USER_AGENT } },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          if (depth > 5) {
            reject(new Error(`Too many redirects for ${url}`));
            res.resume();
            return;
          }
          const next = new URL(res.headers.location, url).toString();
          res.resume();
          fetchText(next, depth + 1).then(resolve).catch(reject);
          return;
        }

        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          res.resume();
          return;
        }

        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      }
    );
    req.on("error", reject);
  });
}

function downloadFile(url, dest, depth = 0) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { headers: { "User-Agent": USER_AGENT } },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          if (depth > 5) {
            reject(new Error(`Too many redirects for ${url}`));
            res.resume();
            return;
          }
          const next = new URL(res.headers.location, url).toString();
          res.resume();
          downloadFile(next, dest, depth + 1).then(resolve).catch(reject);
          return;
        }

        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          res.resume();
          return;
        }

        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
        file.on("error", reject);
      }
    );
    req.on("error", reject);
  });
}

function extractProductLinks(html) {
  const links = new Set();
  const re = /href="(https?:\/\/obera\.fr\/produits\/[^"]+?)"/gi;
  let match;
  while ((match = re.exec(html))) {
    const url = match[1].split("#")[0];
    if (url.endsWith("/produits/") || url.endsWith("/produits")) continue;
    try {
      const segments = new URL(url).pathname.split("/").filter(Boolean);
      const afterProducts = segments[0] === "produits" ? segments.slice(1) : [];
      if (afterProducts.length < 2) continue;
      links.add(url);
    } catch {
      // ignore invalid urls
    }
  }
  return Array.from(links);
}

function extractTitle(html) {
  const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1 && h1[1]) return decodeHtml(h1[1].trim());
  const h2 = html.match(/<h2[^>]*>([^<]+)<\/h2>/i);
  if (h2 && h2[1]) return decodeHtml(h2[1].trim());
  return "";
}

function extractOgImage(html) {
  const og = html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
  if (og && og[1]) return og[1].trim();
  const tw = html.match(/name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
  if (tw && tw[1]) return tw[1].trim();
  return "";
}

function extractOgTitle(html) {
  const og = html.match(/property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  if (og && og[1]) return decodeHtml(og[1].trim());
  return "";
}

function parseDeviceList() {
  const raw = fs.readFileSync(SOURCE_FILE, "utf8");
  const start = raw.indexOf("export const PRODUCTS");
  const end = raw.indexOf("export type DiagnosticTarget");
  const block = start >= 0 && end >= 0 ? raw.slice(start, end) : raw;
  const re = /{ id: "([^"]+)", name: "([^"]+)", category: "([^"]+)"/g;
  const devices = [];
  let match;
  while ((match = re.exec(block))) {
    devices.push({ id: match[1], name: match[2], category: match[3] });
  }
  return devices;
}

function buildIndex(devices) {
  const index = new Map();
  for (const d of devices) {
    const idKey = normalize(d.id);
    const nameKey = normalize(d.name);
    if (idKey && !index.has(idKey)) index.set(idKey, d.id);
    if (nameKey && !index.has(nameKey)) index.set(nameKey, d.id);
  }
  return index;
}

async function main() {
  console.log("Fetching products list...");
  const listHtml = await fetchText(BASE_URL);
  const productLinks = extractProductLinks(listHtml);
  console.log(`Found ${productLinks.length} product pages.`);

  const devices = parseDeviceList();
  const deviceIds = new Set(devices.map((d) => d.id));
  const index = buildIndex(devices);

  const matches = {};
  const unmatchedProducts = [];
  const errors = [];

  for (const link of productLinks) {
    await sleep(REQUEST_DELAY_MS);
    try {
      const html = await fetchText(link);
      const title = extractTitle(html);
      const ogTitle = extractOgTitle(html);
      const image = extractOgImage(html);
      if (!title || !image) {
        errors.push({ link, reason: "missing title or image" });
        continue;
      }
      const url = new URL(link);
      const segments = url.pathname.split("/").filter(Boolean);
      const slugParts = segments[0] === "produits" ? segments.slice(1) : segments;
      const slugKey = normalize(slugParts.join(" "));
      const slugLastKey = normalize(slugParts[slugParts.length - 1] || "");
      const titleKey = normalize(title);
      const ogTitleKey = normalize(ogTitle);
      const keys = [slugKey, slugLastKey, titleKey, ogTitleKey].filter(Boolean);

      let mapped = null;
      for (const k of keys) {
        if (OVERRIDES[k]) {
          mapped = OVERRIDES[k];
          break;
        }
      }
      if (!mapped) {
        for (const k of keys) {
          if (index.has(k)) {
            mapped = index.get(k);
            break;
          }
        }
      }
      if (!mapped) {
        unmatchedProducts.push({ title, link });
        continue;
      }
      const ids = Array.isArray(mapped) ? mapped : [mapped];
      for (const id of ids) {
        if (!deviceIds.has(id)) continue;
        if (matches[id]) continue;
        matches[id] = { title, image };
      }
    } catch (err) {
      errors.push({ link, reason: err.message || "fetch failed" });
    }
  }

  await fsp.mkdir(OUTPUT_DIR, { recursive: true });
  const mapping = {};
  const downloaded = [];
  const skipped = [];

  for (const [id, info] of Object.entries(matches)) {
    await sleep(REQUEST_DELAY_MS);
    try {
      const url = new URL(info.image);
      const ext = path.extname(url.pathname) || ".jpg";
      const filename = `${id}${ext}`;
      const dest = path.join(OUTPUT_DIR, filename);
      await downloadFile(info.image, dest);
      mapping[id] = `assets/obera-products/${filename}`;
      downloaded.push({ id, url: info.image });
    } catch (err) {
      skipped.push({ id, reason: err.message || "download failed" });
    }
  }

  const mappingFile = `export const OBERA_PRODUCT_IMAGES: Record<string, string> = ${JSON.stringify(
    mapping,
    null,
    2
  )} as const;\n\nexport default OBERA_PRODUCT_IMAGES;\n`;
  await fsp.writeFile(MAPPING_FILE, mappingFile, "utf8");

  console.log("---- Summary ----");
  console.log(`Matched devices: ${Object.keys(matches).length}`);
  console.log(`Downloaded images: ${downloaded.length}`);
  console.log(`Unmatched products: ${unmatchedProducts.length}`);
  console.log(`Errors: ${errors.length}`);

  if (unmatchedProducts.length) {
    console.log("Unmatched products:");
    unmatchedProducts.forEach((p) => console.log(`- ${p.title} (${p.link})`));
  }
  if (skipped.length) {
    console.log("Downloads failed:");
    skipped.forEach((s) => console.log(`- ${s.id}: ${s.reason}`));
  }
}

main().catch((err) => {
  console.error("Sync failed:", err);
  process.exit(1);
});

import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

test("la commande explicite démarre Vite et l'API DEMO sur une seule origine", { timeout: 30000 }, async () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const outside = await mkdtemp(join(tmpdir(), "obera-private-static-probe-"));
  const privatePdf = join(outside, "notice.pdf");
  await writeFile(privatePdf, "%PDF-1.4\nPRIVATE TEST\n");
  const child = spawn(process.execPath, ["local-recipe/start.mjs"], { cwd: root,
    stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", data => { output += data.toString(); });
  child.stderr.on("data", data => { output += data.toString(); });
  try {
    for (let attempt = 0; attempt < 100 && !output.includes("Ouvrir dans Edge :"); attempt++) {
      if (child.exitCode !== null) throw new Error(output);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.match(output, /http:\/\/127\.0\.0\.1:5173\//);
    const origin = "http://127.0.0.1:5173";
    assert.equal((await fetch(`${origin}/`)).status, 200);
    assert.equal((await fetch(`${origin}/api/session`)).status, 401);
    const banner = await fetch(`${origin}/src/components/LocalRecipeBanner.tsx`);
    assert.equal(banner.status, 200);
    assert.match(await banner.text(), /MODE RECETTE LOCALE/);
    const directFile = await fetch(`${origin}/@fs/${privatePdf.replaceAll("\\", "/")}`);
    assert.notEqual(directFile.status, 200, "Vite must not serve private PDFs outside the project root");
    for (const filename of ["ic-22.png", "dustomat-4-24.png"]) {
      const photo = await fetch(`${origin}/assets/obera-products/${filename}`);
      assert.equal(photo.status, 200);
      assert.match(photo.headers.get("content-type"), /image\/png/);
      assert.ok((await photo.arrayBuffer()).byteLength > 40000);
    }
    const login = await fetch(`${origin}/api/client/login`, { method: "POST",
      headers: { origin, "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "DEMO-CLIENT-A", pin: "1234" }) });
    assert.equal(login.status, 200);
    const devices = await fetch(`${origin}/api/client/devices`, {
      headers: { cookie: login.headers.get("set-cookie").split(";")[0] } });
    assert.equal((await devices.json()).devices.length, 2);
  } finally {
    child.kill("SIGTERM");
    await new Promise(resolve => child.once("exit", resolve));
    await rm(outside, { recursive: true, force: true });
  }
});

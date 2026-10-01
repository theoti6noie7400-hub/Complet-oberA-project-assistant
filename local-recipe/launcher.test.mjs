import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

test("la commande explicite démarre Vite et l'API DEMO sur une seule origine", { timeout: 30000 }, async () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
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
  }
});

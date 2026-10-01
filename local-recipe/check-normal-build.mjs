import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

const files = await readdir("dist/assets");
const scripts = await Promise.all(files.filter(name => name.endsWith(".js"))
  .map(name => readFile(`dist/assets/${name}`, "utf8")));
for (const marker of ["MODE RECETTE LOCALE", "DEMO-CLIENT-A", "DEMO-STAFF",
  "Réinitialiser les données DEMO", "obera_local_recipe_session"]) {
  assert.equal(scripts.some(source => source.includes(marker)), false,
    `Le build normal contient un élément réservé à la recette : ${marker}`);
}
console.log("Build normal : aucun compte, cookie ni bandeau de recette locale.");

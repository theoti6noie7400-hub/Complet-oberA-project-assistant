import { describe, expect, it } from "vitest";
import { createManualSavRecipeClient, type ManualSavFields } from "./manualSavRecipe";

const fields: ManualSavFields = {
  savReference: " SAV-FICTIF-001 ", serialNumber: "SERIE-FICTIVE-9",
  clientName: "Client Fictif", clientNumber: "CL-FICTIF-1", model: "Appareil démo",
  site: "Site fictif", problem: "Problème fictif\nligne 2", cause: "Cause distincte",
  savAction: "Action distincte", savType: "fournisseur"
};

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => { map.set(key, value); },
    removeItem: (key: string) => { map.delete(key); }
  };
}

const saved = (input: ManualSavFields) => ({
  id: "20000000-0000-4000-8000-000000000002", sav_reference: input.savReference,
  serial_number: input.serialNumber, client_name: input.clientName,
  client_number: input.clientNumber, model: input.model, site: input.site,
  problem: input.problem, cause: input.cause, sav_action: input.savAction,
  sav_type: input.savType
});

describe("saisie SAV en mode recette", () => {
  it("conserve tous les champs tels que saisis et relit le dossier après actualisation", async () => {
    const store = memoryStorage();
    let posts = 0;
    const request = async (_url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        posts++;
        const payload = JSON.parse(init.body as string);
        expect(payload).toMatchObject(fields);
        expect(payload.submissionKey).toMatch(/^[0-9a-f-]{36}$/);
        return Response.json(saved(fields), { status: 201 });
      }
      return Response.json(saved(fields));
    };
    const client = createManualSavRecipeClient(request as typeof fetch, store);
    expect(await client.save(fields)).toEqual(saved(fields));
    expect(await client.save(fields)).toEqual(saved(fields));
    expect(posts).toBe(1);
    expect(await createManualSavRecipeClient(request as typeof fetch, store).lastSaved()).toEqual(saved(fields));
  });

  it("bloque un deuxième clic pendant l'envoi", async () => {
    const store = memoryStorage();
    let posts = 0;
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const request = async (_url: string, init?: RequestInit) => {
      if (init?.method === "POST") { posts++; await gate; return Response.json(saved(fields), { status: 201 }); }
      return Response.json(saved(fields));
    };
    const client = createManualSavRecipeClient(request as typeof fetch, store);
    const first = client.save(fields);
    expect(await client.save(fields)).toBeNull();
    release();
    expect(await first).toEqual(saved(fields));
    expect(posts).toBe(1);
  });

  it("garde la même clé lors d'une erreur réseau, sans créer de simulation", async () => {
    const store = memoryStorage();
    const keys: string[] = [];
    let fail = true;
    const request = async (_url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        keys.push(JSON.parse(init.body as string).submissionKey);
        if (fail) throw new TypeError("Réseau indisponible");
        return Response.json(saved(fields), { status: 201 });
      }
      return Response.json(saved(fields));
    };
    const client = createManualSavRecipeClient(request as typeof fetch, store);
    await expect(client.save(fields)).rejects.toThrow("Réseau indisponible");
    fail = false;
    expect(await client.save(fields)).toEqual(saved(fields));
    expect(keys[0]).toBe(keys[1]);
  });

  it("ne bascule pas en simulation après une erreur serveur et réutilise la clé", async () => {
    const store = memoryStorage();
    const keys: string[] = [];
    let fail = true;
    const request = async (_url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        keys.push(JSON.parse(init.body as string).submissionKey);
        if (fail) return Response.json({ error: "test" }, { status: 500 });
        return Response.json(saved(fields), { status: 200 });
      }
      return Response.json(saved(fields));
    };
    const client = createManualSavRecipeClient(request as typeof fetch, store);
    await expect(client.save(fields)).rejects.toThrow("500");
    fail = false;
    expect(await client.save(fields)).toEqual(saved(fields));
    expect(keys[0]).toBe(keys[1]);
  });
});

export type ManualSavFields = {
  savReference: string;
  serialNumber: string;
  clientName: string;
  clientNumber: string;
  model: string;
  site: string;
  problem: string;
  cause: string;
  savAction: string;
  savType: "technique" | "usure" | "fournisseur" | "casse" | "autre";
};

export type SavedManualSav = {
  id: string;
  sav_reference: string;
  serial_number: string;
  client_name: string;
  client_number: string;
  model: string;
  site: string;
  problem: string;
  cause: string;
  sav_action: string;
  sav_type: string;
};

const pendingKey = "obera_recipe_manual_sav_pending";
export const lastSavedKey = "obera_recipe_manual_sav_last";
const lastSavedHashKey = "obera_recipe_manual_sav_last_hash";

const caseValues = (item: SavedManualSav) => [item.sav_reference, item.serial_number,
  item.client_name, item.client_number, item.model, item.site, item.problem,
  item.cause, item.sav_action, item.sav_type];
const draftValues = (item: ManualSavFields) => [item.savReference, item.serialNumber,
  item.clientName, item.clientNumber, item.model, item.site, item.problem,
  item.cause, item.savAction, item.savType];

async function fingerprint(item: ManualSavFields): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(draftValues(item))));
  return Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2, "0")).join("");
}

async function readResponse(response: Response): Promise<SavedManualSav> {
  if (!response.ok) throw new Error(`Serveur indisponible ou accès refusé (${response.status}).`);
  return response.json() as Promise<SavedManualSav>;
}

export function createManualSavRecipeClient(
  request: typeof fetch,
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">
) {
  let inFlight = false;

  async function read(id: string): Promise<SavedManualSav> {
    return readResponse(await request(`/api/sav/cases/${encodeURIComponent(id)}`, {
      credentials: "same-origin"
    }));
  }

  return {
    startNew(): void {
      storage.removeItem(lastSavedKey);
      storage.removeItem(lastSavedHashKey);
      storage.removeItem(pendingKey);
    },
    async lastSaved(): Promise<SavedManualSav | null> {
      const id = storage.getItem(lastSavedKey);
      return id ? read(id) : null;
    },

    async save(fields: ManualSavFields): Promise<SavedManualSav | null> {
      if (inFlight) return null;
      inFlight = true;
      try {
        const hash = await fingerprint(fields);
        const lastId = storage.getItem(lastSavedKey);
        if (lastId && storage.getItem(lastSavedHashKey) === hash) return read(lastId);
        let pending: { hash: string; key: string } | null = null;
        try { pending = JSON.parse(storage.getItem(pendingKey) ?? "null"); } catch {}
        const submissionKey = pending?.hash === hash ? pending.key : crypto.randomUUID();
        storage.setItem(pendingKey, JSON.stringify({ hash, key: submissionKey }));
        const response = await request("/api/sav/cases", {
          method: "POST", credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...fields, submissionKey })
        });
        const created = await readResponse(response);
        const confirmed = await read(created.id);
        if (JSON.stringify(caseValues(confirmed)) !== JSON.stringify(draftValues(fields)))
          throw new Error("La relecture du dossier ne correspond pas aux champs saisis.");
        storage.setItem(lastSavedKey, confirmed.id);
        storage.setItem(lastSavedHashKey, hash);
        storage.removeItem(pendingKey);
        return confirmed;
      } finally {
        inFlight = false;
      }
    }
  };
}

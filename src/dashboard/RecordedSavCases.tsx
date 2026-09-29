import { useEffect, useState } from "react";

type SavCase = {
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
  status: string;
  created_at: string;
  updated_at: string;
};

function errorMessage(error: unknown, detail = false): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Session API expirée ou absente. Ouvrez la session fictive SAV.";
    if (error.status === 403) return "Accès refusé aux dossiers SAV.";
    if (error.status === 404 && detail) return "Dossier introuvable ou supprimé.";
    return `Lecture des dossiers impossible (${error.status}).`;
  }
  return "Erreur réseau : impossible de lire les dossiers SAV. Réessayez.";
}

class ApiError extends Error {
  constructor(readonly status: number) { super(`HTTP ${status}`); }
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw new ApiError(response.status);
  return response.json() as Promise<T>;
}

const reference = (item: SavCase) => item.sav_reference || "Référence SAV non renseignée";

export default function RecordedSavCases() {
  const [cases, setCases] = useState<SavCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [sessionMissing, setSessionMissing] = useState(false);
  const [selected, setSelected] = useState<SavCase | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setListError("");
    setCases([]);
    setSelected(null);
    fetch("/api/sav/cases", { credentials: "same-origin", signal: controller.signal })
      .then(response => readJson<{ cases: SavCase[] }>(response))
      .then(data => { if (!controller.signal.aborted) { setCases(data.cases); setSessionMissing(false); } })
      .catch(error => {
        if (!controller.signal.aborted) {
          setListError(errorMessage(error));
          setSessionMissing(error instanceof ApiError && error.status === 401);
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);

  async function openSession() {
    try {
      await readJson(await fetch("/api/recipe/session", {
        method: "POST", credentials: "same-origin"
      }));
      setReload(value => value + 1);
    } catch (error) { setListError(errorMessage(error)); }
  }

  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    setDetailLoading(true);
    setDetailError("");
    const id = selected.id;
    fetch(`/api/sav/cases/${encodeURIComponent(id)}`, {
      credentials: "same-origin", signal: controller.signal
    }).then(response => readJson<SavCase>(response))
      .then(item => { if (!controller.signal.aborted) setSelected(item); })
      .catch(error => { if (!controller.signal.aborted) setDetailError(errorMessage(error, true)); })
      .finally(() => { if (!controller.signal.aborted) setDetailLoading(false); });
    return () => controller.abort();
  }, [selected?.id]);

  return (
    <div className="obera-panel p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-medium text-stone-800">Dossiers SAV enregistrés</h3>
          <p className="text-sm text-stone-500">Données de recette enregistrées sur le serveur.</p>
        </div>
        <button type="button" className="obera-tab" onClick={() => setReload(value => value + 1)}>
          Actualiser la liste
        </button>
      </div>
      {loading && <p role="status">Chargement des dossiers…</p>}
      {listError && <p role="alert" className="text-red-700">{listError}</p>}
      {sessionMissing && <button type="button" className="obera-tab" onClick={openSession}>
        Ouvrir la session fictive SAV
      </button>}
      {!loading && !listError && cases.length === 0 && <p>Aucun dossier SAV enregistré.</p>}
      {!loading && !listError && cases.length > 0 && (
        <div className="overflow-x-auto">
          <table className="obera-table">
            <thead><tr>
              <th className="py-2 text-left">Référence SAV</th>
              <th className="py-2 text-left">Client</th>
              <th className="py-2 text-left">Appareil</th>
              <th className="py-2 text-left">Numéro de série</th>
              <th className="py-2 text-left">Statut</th>
              <th className="py-2 text-left">Créé le</th>
            </tr></thead>
            <tbody>{cases.map(item => <tr key={item.id}>
              <td className="py-2"><button type="button" className="text-blue-700 underline"
                onClick={() => setSelected(item)} aria-label={`Ouvrir le dossier ${reference(item)}`}>
                {reference(item)}
              </button></td>
              <td className="py-2">{item.client_name}</td>
              <td className="py-2">{item.model}</td>
              <td className="py-2">{item.serial_number}</td>
              <td className="py-2">{item.status}</td>
              <td className="py-2">{new Date(item.created_at).toLocaleString("fr-FR")}</td>
            </tr>)}</tbody>
          </table>
        </div>
      )}
      {!loading && !listError && cases.length >= 100 && (
        <p role="status" className="text-amber-800">
          Limite de 100 dossiers affichés : d’autres dossiers peuvent exister sur le serveur.
        </p>
      )}
      {selected && (
        <div role="dialog" aria-label="Détail du dossier SAV" aria-modal="true"
          className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <div className="h-full w-full max-w-md obera-drawer p-6 overflow-y-auto">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-semibold">{reference(selected)}</h3>
              <button type="button" onClick={() => setSelected(null)}>Fermer</button>
            </div>
            {detailLoading && <p role="status">Chargement du détail…</p>}
            {detailError && <p role="alert" className="text-red-700">{detailError}</p>}
            {!detailLoading && !detailError && <dl className="space-y-3 text-sm">
              {([
                ["Référence SAV", selected.sav_reference],
                ["Numéro de série", selected.serial_number],
                ["Client", selected.client_name],
                ["Numéro client", selected.client_number],
                ["Appareil", selected.model], ["Site", selected.site],
                ["Type SAV", selected.sav_type], ["Statut", selected.status],
                ["Problème", selected.problem], ["Cause", selected.cause],
                ["Action SAV", selected.sav_action],
                ["Créé le", new Date(selected.created_at).toLocaleString("fr-FR")],
                ["Mis à jour le", new Date(selected.updated_at).toLocaleString("fr-FR")]
              ] as const).map(([label, value]) => <div key={label}>
                <dt className="text-stone-500">{label}</dt><dd className="whitespace-pre-wrap">{value}</dd>
              </div>)}</dl>}
          </div>
        </div>
      )}
    </div>
  );
}

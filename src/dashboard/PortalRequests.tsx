import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

type PortalRequest = {
  id: string; kind: "client" | "reseller"; request_type: "sav" | "consumables" | "maintenance_quote" | "general";
  organization_name: string; author_identifier: string; subject: string; message: string;
  public_status: "received" | "in_progress" | "closed"; created_at: string;
  device_model: string | null; device_serial: string | null;
  maintenance_devices?: { model: string; serial: string }[];
  linked_sav_case_id: string | null; linked_sav_reference: string | null;
  diagnostic_context?: {
    version: number; graphFingerprint: string; productId: string;
    device: { id: string; model: string; serial: string }; symptom: string;
    steps: { nodeId: string; title: string; answer?: string; actionProposed?: string;
      clientConfirmed?: boolean }[];
    result: "unresolved"; comment: string;
  } | null;
};
type CompatibleCase = { id: string; sav_reference: string };
const statuses = { received: "Reçue", in_progress: "En cours", closed: "Terminée" };
const types = { sav: "SAV", consumables: "Consommables", maintenance_quote: "Contrat de maintenance / demande de devis", general: "Générale (archive)" };
const devicesFor = (item: PortalRequest) => item.maintenance_devices?.length ?
  item.maintenance_devices.map(device => `${device.model} — ${device.serial}`).join(", ") : item.device_model ?? "—";

class ApiError extends Error {
  constructor(readonly status: number) { super(`HTTP ${status}`); }
}
async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: "same-origin", cache: "no-store", ...options });
  if (!response.ok) throw new ApiError(response.status);
  return response.json() as Promise<T>;
}
function explain(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Session expirée. Reconnectez-vous.";
    if (error.status === 403) return "Accès refusé aux demandes portail.";
    if (error.status === 404) return "Demande ou dossier introuvable ou inaccessible.";
    if (error.status === 409) return "Transition impossible ou demande déjà rattachée. Actualisez le détail.";
    return `Opération indisponible (${error.status}).`;
  }
  return "Erreur réseau. Réessayez sans recréer la demande.";
}

export default function PortalRequests() {
  const [items, setItems] = useState<PortalRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PortalRequest | null>(null);
  const [compatible, setCompatible] = useState<CompatibleCase[]>([]);
  const [chosenCase, setChosenCase] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState("all");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setItems([]);
    const url = filter === "all" ? "/api/portal/requests" :
      `/api/portal/requests?requestType=${encodeURIComponent(filter)}`;
    api<{ requests: PortalRequest[]; has_more: boolean }>(url, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) { setItems(data.requests); setHasMore(data.has_more); } })
      .catch(err => { if (!controller.signal.aborted) setError(explain(err)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refresh, filter]);

  useEffect(() => {
    if (!selectedId) { setDetail(null); setCompatible([]); return; }
    const controller = new AbortController();
    setDetail(null); setCompatible([]); setChosenCase(""); setDetailError("");
    const path = `/api/portal/requests/${encodeURIComponent(selectedId)}`;
    api<PortalRequest>(path, { signal: controller.signal }).then(async record => {
      if (controller.signal.aborted) return;
      setDetail(record);
      if (record.kind === "client" && record.request_type === "sav" && !record.linked_sav_case_id) {
        const result = await api<{ cases: CompatibleCase[] }>(`${path}/compatible-cases`, { signal: controller.signal });
        if (!controller.signal.aborted) setCompatible(result.cases);
      }
    }).catch(err => { if (!controller.signal.aborted) setDetailError(explain(err)); });
    return () => controller.abort();
  }, [selectedId, refresh]);

  async function change(path: string, body: object) {
    if (!selectedId || busy) return;
    setBusy(true); setDetailError("");
    try {
      await api(`/api/portal/requests/${encodeURIComponent(selectedId)}/${path}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
      });
      setRefresh(value => value + 1);
    } catch (err) { setDetailError(explain(err)); }
    finally { setBusy(false); }
  }

  return <section className="obera-panel p-4 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="font-medium">Demandes Client</h3>
        <p className="text-sm text-stone-500">Demandes enregistrées dans PostgreSQL, séparées des statistiques de démonstration.</p></div>
      <button className="obera-tab" type="button" onClick={() => setRefresh(value => value + 1)}>Actualiser</button>
    </div>
    <label className="block max-w-sm">Filtrer par motif
      <select className="block w-full border rounded p-2" value={filter} onChange={event => { setFilter(event.target.value); setSelectedId(null); }}>
        <option value="all">Toutes les demandes (archives incluses)</option>
        <option value="sav">SAV</option><option value="consumables">Consommables</option>
        <option value="maintenance_quote">Contrat de maintenance / demande de devis</option>
      </select>
    </label>
    {loading && <p role="status">Chargement des demandes…</p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {error.includes("Session expirée") && <Link to="/admin-login?next=%2Fsav-maintenance" className="underline">Se reconnecter</Link>}
    {!loading && !error && !items.length && <p>Aucune demande pour ce filtre.</p>}
    {!loading && !error && items.length > 0 && <div className="overflow-x-auto"><table className="obera-table">
      <thead><tr>{["Origine", "Organisation", "Type", "Objet", "Date", "Statut", "Appareil"].map(label =>
        <th className="py-2 text-left" key={label}>{label}</th>)}</tr></thead>
      <tbody>{items.map(item => <tr key={item.id}>
        <td className="py-2">{item.kind === "client" ? "Client" : "Revendeur"}</td>
        <td className="py-2">{item.organization_name}</td><td className="py-2">{types[item.request_type]}</td>
        <td className="py-2"><button type="button" className="underline text-blue-700"
          onClick={() => setSelectedId(item.id)}>{item.subject}</button></td>
        <td className="py-2">{new Date(item.created_at).toLocaleString("fr-FR")}</td>
        <td className="py-2">{statuses[item.public_status]}</td>
        <td className="py-2">{devicesFor(item)}</td>
      </tr>)}</tbody></table></div>}
    {hasMore && <p role="status">Les 100 demandes les plus récentes sont affichées. D’autres demandes existent.</p>}
    {selectedId && <div role="dialog" aria-label="Détail de la demande portail" aria-modal="true"
      className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div className="h-full w-full max-w-md obera-drawer p-6 overflow-y-auto space-y-4">
        <div className="flex justify-between gap-3"><h3 className="text-lg font-semibold">{detail?.subject ?? "Demande Portail"}</h3>
          <button type="button" onClick={() => setSelectedId(null)}>Fermer</button></div>
        {detailError && <p role="alert" className="text-red-700">{detailError}</p>}
        {!detail && !detailError && <p role="status">Chargement du détail…</p>}
        {detail && <>
          <dl className="space-y-2 text-sm">{([
            ["Origine", detail.kind === "client" ? "Client" : "Revendeur"],
            ["Organisation", detail.organization_name], ["Auteur", detail.author_identifier],
            ["Type", types[detail.request_type]], ["Objet", detail.subject], ["Message", detail.message],
            ["Date", new Date(detail.created_at).toLocaleString("fr-FR")],
            ["Statut public", statuses[detail.public_status]],
            ["Appareil(s)", devicesFor(detail)], ["Numéro de série", detail.device_serial ?? "—"],
            ["Dossier SAV lié", detail.linked_sav_reference || (detail.linked_sav_case_id ? "Référence non renseignée" : "Aucun")]
          ] as const).map(([name, value]) => <div key={name}><dt className="text-stone-500">{name}</dt>
            <dd className="whitespace-pre-wrap">{value}</dd></div>)}</dl>
          {detail.diagnostic_context && <section className="border-t pt-3 space-y-2" aria-label="Parcours diagnostic Client">
            <h4 className="font-medium">Parcours diagnostic transmis par le Client</h4>
            <p className="text-sm">Appareil : {detail.diagnostic_context.device.model} — {detail.diagnostic_context.device.serial}</p>
            <p className="text-sm">Symptôme déclaré : {detail.diagnostic_context.symptom}</p>
            <ol className="list-decimal pl-5 space-y-2 text-sm">{detail.diagnostic_context.steps.map((step, index) =>
              <li key={`${step.nodeId}-${index}`}>{step.title}
                {step.answer && <span> — Réponse : {step.answer}</span>}
                {step.actionProposed && <div>Contrôle/action présenté : {step.actionProposed}
                  {step.clientConfirmed === true ? " — effectué selon le Client" :
                    " — réalisation non confirmée"}</div>}
              </li>)}</ol>
            <p className="text-sm">Résultat déclaré : problème persistant. Ce parcours ne constitue pas un diagnostic technique définitif.</p>
          </section>}
          {detail.kind === "client" && detail.public_status !== "closed" && <button type="button" disabled={busy}
            className="obera-btn-primary" onClick={() => change("status", {
              status: detail.public_status === "received" ? "in_progress" : "closed"
            })}>{detail.public_status === "received" ? "Passer en cours" : "Terminer"}</button>}
          {detail.kind === "client" && detail.request_type === "sav" && !detail.linked_sav_case_id && <div className="space-y-2">
            <h4 className="font-medium">Créer / rattacher un dossier SAV</h4>
            <p className="text-sm">Le rattachement concerne uniquement un dossier existant du même client et du même appareil.
              La création nécessite une saisie interne complète des champs métier.</p>
            {compatible.length === 0 ? <p>Aucun dossier existant compatible.</p> : <>
              <label className="block">Dossier compatible
                <select className="block w-full border rounded p-2" value={chosenCase}
                  onChange={event => setChosenCase(event.target.value)}>
                  <option value="">Choisir un dossier</option>
                  {compatible.map(item => <option key={item.id} value={item.id}>
                    {item.sav_reference || "Référence SAV non renseignée"}</option>)}
                </select></label>
              <button className="obera-btn-primary" type="button" disabled={!chosenCase || busy}
                onClick={() => change("sav-case", { savCaseId: chosenCase })}>Rattacher le dossier SAV</button>
            </>}
          </div>}
        </>}
      </div>
    </div>}
  </section>;
}

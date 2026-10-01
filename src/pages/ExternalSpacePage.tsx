import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import PortalTopBar from "../components/PortalTopBar";
import { useAdminAuth, type ExternalRole } from "../auth/adminAuth";
import { DIAGNOSTIC_NODES, PRODUCTS, getDiagnosticStartNode, resolveDynamicNext } from "../lib/assistantData";
import { resolveDiagnosticPath, type DiagnosticChoice, type DiagnosticPath } from "../lib/diagnosticContext";
import { ClientPark, ClientDiagnosticSelector, ClientDevicePhoto, type ClientDevice } from "../components/ClientPark";

type View = "home" | "device" | "diagnostic" | "request";
type Device = ClientDevice;
type PublicRequest = { id: string; request_type: string; device_id: string | null;
  device_ids?: string[]; subject: string; message: string; public_status: string; created_at: string };
type Document = { id: string; title: string; created_at: string };
const publicStatusLabel = (status: string) => ({ received: "Reçue", in_progress: "En cours",
  closed: "Terminée", unavailable: "Indisponible" }[status] ?? "Indisponible");
const requestTypeLabel = (type: string) => ({ sav: "SAV", consumables: "Consommables",
  maintenance_quote: "Contrat de maintenance / demande de devis",
  general: "Autre demande" }[type] ?? "Demande");

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: "same-origin", cache: "no-store", ...options });
  if (!response.ok) throw new Error(response.status === 401 ? "Session expirée. Reconnectez-vous." :
    response.status === 404 ? "Élément introuvable ou non accessible." :
    `Opération indisponible (${response.status}).`);
  return response.json() as Promise<T>;
}

const pendingDiagnosticKey = (organizationId: string, deviceId: string) =>
  `obera:pending-diagnostic:${organizationId}:${deviceId}`;

function ExternalDiagnostic({ device, base, organizationId }: { device: Device; base: string; organizationId: string }) {
  const product = PRODUCTS.find(item => item.name.toLocaleLowerCase("fr") === device.model.toLocaleLowerCase("fr"));
  const [history, setHistory] = useState<DiagnosticChoice[]>([]);
  useEffect(() => { setHistory(product ? [{ nodeId: getDiagnosticStartNode(product.id) }] : []); }, [device.id, product?.id]);
  const node = history.length ? DIAGNOSTIC_NODES[history[history.length - 1].nodeId] : null;
  function savePath() {
    if (!product || !node || node.type !== "text" || node.next) return;
    const path: DiagnosticPath = { version: 1, productId: product.id, steps: history, result: "unresolved" };
    if (resolveDiagnosticPath(path, device.model))
      sessionStorage.setItem(pendingDiagnosticKey(organizationId, device.id), JSON.stringify(path));
  }
  return <section className="obera-panel p-5 space-y-4">
    <h2 className="text-xl font-semibold">Diagnostic : {device.model}</h2>
    <p>Appareil : {device.serial}</p>
    {!product && <p role="status">Aucun diagnostic de ce modèle n'est disponible dans le portail.</p>}
    {product && !node && <p role="alert">Étape de diagnostic indisponible.</p>}
    {node && <>
      <h3 className="font-semibold">{node.title}</h3>
      {node.type === "question" ? <div className="flex flex-wrap gap-2">
        {node.options.map((option, index) => <button className="obera-btn-outline" type="button" key={option.label}
          onClick={() => setHistory(value => [...value.slice(0, -1),
            { ...value[value.length - 1], optionIndex: index },
            { nodeId: resolveDynamicNext(option.next, product!.id) }])}>
          {option.label}
        </button>)}
      </div> : <>
        <p>{node.body}</p>
        <label className="flex gap-2 items-center text-sm"><input type="checkbox"
          checked={history[history.length - 1].confirmed === true}
          onChange={event => setHistory(value => [...value.slice(0, -1),
            { ...value[value.length - 1], confirmed: event.target.checked }])} />
          Je confirme avoir effectué le contrôle proposé, s'il s'applique à cette étape.
        </label>
        {node.next && <button className="obera-btn-outline" type="button"
          onClick={() => setHistory(value => [...value.slice(0, -1),
            { ...value[value.length - 1], continued: true },
            { nodeId: resolveDynamicNext(node.next!, product!.id) }])}>
          Continuer
        </button>}
        {node.target === "filter" && <Link className="obera-btn-primary inline-flex" to={`${base}?type=consumables&device=${device.id}`}>Demander des consommables</Link>}
        {!node.next && <Link className="obera-btn-primary inline-flex"
          onClick={savePath} to={`${base}?type=sav&device=${device.id}&diagnostic=1`}>
          Contacter le SAV / créer une demande</Link>}
      </>}
    </>}
    {history.length > 1 && <button className="obera-btn-outline" type="button"
      onClick={() => setHistory(value => {
        const previous = value.slice(0, -1);
        return [...previous.slice(0, -1), { nodeId: previous[previous.length - 1].nodeId,
          ...(previous[previous.length - 1].confirmed === undefined ? {} :
            { confirmed: previous[previous.length - 1].confirmed }) }];
      })}>Étape précédente</button>}
    <Link className="block underline" to={`${base}/devices/${device.id}`}>Retour à l'appareil</Link>
  </section>;
}

export default function ExternalSpacePage({ role, view = "home" }: { role: ExternalRole; view?: View }) {
  const base = role === "client" ? "/client-space" : "/reseller-space";
  const apiBase = `/api/${role}`;
  const title = role === "client" ? "Espace Client" : "Espace Revendeur";
  const { id } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { isLoading, externalRole, externalOrganizationId, loginExternal, logout } = useAdminAuth();
  const [identifier, setIdentifier] = useState("");
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [busy, setBusy] = useState(false);
  const [organization, setOrganization] = useState("");
  const [loadedFor, setLoadedFor] = useState("");
  const [devices, setDevices] = useState<Device[]>([]);
  const [requests, setRequests] = useState<PublicRequest[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<PublicRequest | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [requestType, setRequestType] = useState<"sav" | "consumables" | "maintenance_quote" | "general">(
    role === "client" && params.get("type") === "maintenance_quote" ? "maintenance_quote" :
    role === "client" && params.get("type") !== "consumables" ? "sav" :
    params.get("type") === "consumables" ? "consumables" : "general");
  const [deviceId, setDeviceId] = useState(params.get("device") ?? "");
  const [maintenanceDeviceIds, setMaintenanceDeviceIds] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [creationError, setCreationError] = useState("");
  const [saved, setSaved] = useState<PublicRequest | null>(null);
  const [submissionKey, setSubmissionKey] = useState("");
  const [pendingDiagnostic, setPendingDiagnostic] = useState<DiagnosticPath | null>(null);

  useEffect(() => {
    if (role !== "client" || view !== "home") return;
    const requested = params.get("type");
    if (requested === "sav" || requested === "consumables" || requested === "maintenance_quote")
      setRequestType(requested);
    if (params.get("device")) setDeviceId(params.get("device")!);
  }, [role, view, params]);

  useEffect(() => {
    if (role !== "client" || view !== "home" || !externalOrganizationId || params.get("diagnostic") !== "1") {
      setPendingDiagnostic(null); return;
    }
    const selected = params.get("device");
    if (!selected) { setPendingDiagnostic(null); return; }
    try {
      const raw = sessionStorage.getItem(pendingDiagnosticKey(externalOrganizationId, selected));
      const path = raw ? JSON.parse(raw) as DiagnosticPath : null;
      setPendingDiagnostic(path);
    } catch { setPendingDiagnostic(null); }
  }, [role, view, externalOrganizationId, params]);

  useEffect(() => {
    if (!pendingDiagnostic || !devices.length) return;
    const selected = devices.find(item => item.id === deviceId);
    const summary = selected && resolveDiagnosticPath(pendingDiagnostic, selected.model);
    if (summary) setSubject(previous => previous || `Diagnostic : ${summary.symptom}`);
  }, [pendingDiagnostic, devices, deviceId]);

  useEffect(() => {
    if (externalRole !== role || !externalOrganizationId) {
      setDevices([]); setRequests([]); setDocuments([]); setSelectedDevice(null);
      setSelectedRequest(null); setOrganization(""); setLoadedFor(""); return;
    }
    let active = true;
    setError(""); setDevices([]); setRequests([]); setDocuments([]);
    setSelectedDevice(null); setSelectedRequest(null);
    const calls: Promise<unknown>[] = [api<{ organization: { name: string } }>(`${apiBase}/me`),
      api<{ requests: PublicRequest[] }>(`${apiBase}/requests`),
      api<{ documents: Document[] }>(`${apiBase}/documents`)];
    if (role === "client") calls.push(api<{ devices: Device[] }>(`${apiBase}/devices`));
    if (view === "device" || view === "diagnostic") calls.push(api<Device>(`${apiBase}/devices/${id}`));
    if (view === "request") calls.push(api<PublicRequest>(`${apiBase}/requests/${id}`));
    Promise.all(calls).then(values => {
      if (!active) return;
      setOrganization((values[0] as { organization: { name: string } }).organization.name);
      setLoadedFor(externalOrganizationId);
      setRequests((values[1] as { requests: PublicRequest[] }).requests);
      setDocuments((values[2] as { documents: Document[] }).documents);
      let cursor = 3;
      if (role === "client") setDevices((values[cursor++] as { devices: Device[] }).devices);
      if (view === "device" || view === "diagnostic") setSelectedDevice(values[cursor] as Device);
      if (view === "request") setSelectedRequest(values[cursor] as PublicRequest);
    }).catch(failure => { if (active) { setOrganization(""); setLoadedFor(externalOrganizationId);
      setError(failure.message); } });
    return () => { active = false; };
  }, [role, externalRole, externalOrganizationId, apiBase, view, id, reload]);

  async function signIn(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setLoginError("");
    const valid = await loginExternal(role, identifier, pin);
    setBusy(false); setPin("");
    if (!valid) setLoginError("Connexion refusée. Vérifiez vos informations ou réessayez plus tard.");
  }

  async function create(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setCreationError(""); setSaved(null);
    const key = submissionKey || window.crypto.randomUUID();
    setSubmissionKey(key);
    try {
      const result = await api<PublicRequest>(`${apiBase}/requests`, { method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionKey: key, requestType,
          ...(role === "client" && requestType === "maintenance_quote" ? { deviceIds: maintenanceDeviceIds } :
            role === "client" && deviceId ? { deviceId } : {}), subject,
          message: pendingDiagnostic && requestType === "sav" && !message.trim() ?
            "Diagnostic transmis sans commentaire supplémentaire." : message,
          ...(role === "client" && requestType === "sav" && pendingDiagnostic &&
            deviceId === params.get("device") ? { diagnosticContext: pendingDiagnostic } : {}) }) });
      if (pendingDiagnostic && externalOrganizationId)
        sessionStorage.removeItem(pendingDiagnosticKey(externalOrganizationId, deviceId));
      setPendingDiagnostic(null);
      setSaved(result); setSubmissionKey(""); setSubject(""); setMessage(""); setReload(value => value + 1);
      if (params.get("diagnostic") === "1") navigate(base, { replace: true });
    } catch (failure) { setCreationError((failure as Error).message); }
    finally { setBusy(false); }
  }

  if (isLoading) return <p role="status">Vérification de la session…</p>;
  if (externalRole && externalRole !== role)
    return <div className="portal-page"><PortalTopBar subtitle={title} showInternalLink={false} /><main className="portal-main obera-panel p-5">
      <h1>Accès refusé</h1><Link to="/" className="underline">Retour Portail</Link>
    </main></div>;
  if (externalRole !== role) return <div className="portal-page"><PortalTopBar subtitle={title} showInternalLink={false} />
    <main className="portal-main"><section className="obera-panel p-5 max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Connexion {title.toLowerCase()}</h1>
      <form onSubmit={signIn} className="space-y-4">
        <label className="block">Identifiant<input className="w-full p-2 border rounded" autoComplete="username"
          value={identifier} onChange={event => setIdentifier(event.target.value)} required /></label>
        <label className="block">Code PIN<input className="w-full p-2 border rounded" type="password"
          inputMode="numeric" autoComplete="current-password" value={pin}
          onChange={event => setPin(event.target.value)} required /></label>
        {loginError && <p role="alert">{loginError}</p>}
        <button className="obera-btn-primary" type="submit" disabled={busy}>{busy ? "Connexion…" : "Se connecter"}</button>
      </form><Link to="/" className="underline">Retour Portail</Link>
    </section></main></div>;

  if (loadedFor !== externalOrganizationId)
    return <div className="portal-page"><PortalTopBar subtitle={title} showInternalLink={false} />
      <main className="portal-main"><p role="status">Chargement de votre espace…</p></main></div>;

  return <div className="portal-page"><PortalTopBar subtitle={title} showInternalLink={false} />
    <main className="portal-main space-y-6">
      <section className="obera-panel p-5 flex flex-wrap justify-between gap-3">
        <div><h1 className="text-2xl font-semibold">{title}</h1>
          <p>{organization ? `Bienvenue, ${organization}` : "Chargement de votre organisation…"}</p></div>
        <button type="button" className="obera-btn-outline" onClick={async () => {
          if (await logout()) { setSaved(null); setSubmissionKey(""); setPendingDiagnostic(null);
            if (externalOrganizationId && params.get("device"))
              sessionStorage.removeItem(pendingDiagnosticKey(externalOrganizationId, params.get("device")!)); }
          else setError("Déconnexion impossible. Réessayez.");
        }}>Déconnexion</button>
      </section>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {role === "client" && view === "home" && <nav aria-label="Navigation de l'espace Client"
        className="obera-panel p-4 flex flex-wrap gap-4">
        <a className="underline" href="#mes-appareils">Mes appareils</a>
        <a className="underline" href="#mes-demandes">Mes demandes</a>
        <a className="underline" href="#nouvelle-demande">Nouvelle demande</a>
        <a className="underline" href="#mes-documents">Documents</a>
      </nav>}
      {view !== "home" && <Link className="underline" to={base}>Retour à mon espace</Link>}
      {view === "device" && selectedDevice && <section className="obera-panel p-5 space-y-3">
        <ClientDevicePhoto model={selectedDevice.model} detail />
        <h2 className="text-xl font-semibold">{selectedDevice.model}</h2><p>Numéro de série : {selectedDevice.serial}</p>
        <div className="client-device-actions">
          <Link className="obera-btn-primary" to={`${base}/diagnostic/${selectedDevice.id}`}>Démarrer le diagnostic</Link>
          <Link className="obera-btn-outline" to={`${base}?type=sav&device=${selectedDevice.id}#nouvelle-demande`}>Créer une demande SAV</Link>
          <Link className="obera-btn-outline" to={`${base}?type=consumables&device=${selectedDevice.id}#nouvelle-demande`}>Demander des consommables</Link>
          {selectedDevice.notice_available ? <a className="obera-btn-outline"
            href={`/api/client/devices/${selectedDevice.id}/notice`}>Télécharger la notice</a> :
            <span>Notice indisponible</span>}
        </div>
      </section>}
      {view === "diagnostic" && selectedDevice && externalOrganizationId &&
        <ExternalDiagnostic device={selectedDevice} base={base} organizationId={externalOrganizationId} />}
      {view === "request" && selectedRequest && <section className="obera-panel p-5 space-y-2">
        <h2 className="text-xl font-semibold">{selectedRequest.subject}</h2>
        <p>Statut : {publicStatusLabel(selectedRequest.public_status)}</p><p>Type : {requestTypeLabel(selectedRequest.request_type)}</p>
        {selectedRequest.device_id && devices.find(device => device.id === selectedRequest.device_id) &&
          <p>Appareil : {devices.find(device => device.id === selectedRequest.device_id)?.model} — {devices.find(device => device.id === selectedRequest.device_id)?.serial}</p>}
        {selectedRequest.request_type === "maintenance_quote" && <p>Appareils :
          {selectedRequest.device_ids?.length ? selectedRequest.device_ids.map(selected => {
            const device = devices.find(item => item.id === selected);
            return device ? `${device.model} — ${device.serial}` : "Appareil indisponible";
          }).join(", ") : " Aucun appareil sélectionné"}</p>}
        <p>{selectedRequest.message}</p><p>Créée le {new Date(selectedRequest.created_at).toLocaleDateString("fr-FR")}</p>
      </section>}
      {view === "home" && <>
        {role === "client" && <><ClientPark devices={devices} base={base} />
          <ClientDiagnosticSelector devices={devices} base={base} /></>}
        <section id="nouvelle-demande" className="obera-panel p-5"><h2 className="text-xl font-semibold mb-3">Nouvelle demande</h2>
          <form onSubmit={create} className="space-y-3 max-w-xl">
            {params.get("diagnostic") === "1" && requestType === "sav" && !pendingDiagnostic && !saved &&
              <p role="alert">Résumé du diagnostic indisponible. Relancez le diagnostic depuis la fiche de l'appareil si vous souhaitez le transmettre.</p>}
            {pendingDiagnostic && requestType === "sav" && devices.find(item => item.id === deviceId) &&
              <p role="status">Le parcours de diagnostic sera transmis au SAV avec cette demande. Vous pouvez ajouter un commentaire.</p>}
            <label className="block">Type de demande<select className="w-full p-2 border rounded" value={requestType}
              onChange={event => { setRequestType(event.target.value as typeof requestType); setDeviceId("");
                setPendingDiagnostic(null); setMaintenanceDeviceIds([]); setSubmissionKey(""); }}>
              {role === "client" && <option value="sav">Problème / SAV</option>}
              <option value="consumables">Consommables</option>
              {role === "client" && <option value="maintenance_quote">Contrat de maintenance / demande de devis</option>}
              {role === "reseller" && <option value="general">Autre demande</option>}
            </select></label>
            {role === "client" && requestType !== "maintenance_quote" && <label className="block">Appareil{requestType === "sav" ? " concerné" : " (facultatif)"}
              <select className="w-full p-2 border rounded" value={deviceId} required={requestType === "sav"}
                onChange={event => { setDeviceId(event.target.value); setPendingDiagnostic(null); setSubmissionKey(""); }}>
                <option value="">Sélectionnez un appareil</option>
                {devices.map(device => <option key={device.id} value={device.id}>{device.model} — {device.serial}</option>)}
              </select></label>}
            {role === "client" && requestType === "maintenance_quote" && <fieldset className="space-y-2">
              <legend>Appareils concernés (facultatif, choix multiple)</legend>
              {devices.length === 0 ? <p>Aucun appareil enregistré. Vous pouvez envoyer une demande générale.</p> :
                devices.map(device => <label key={device.id} className="flex gap-2 items-center">
                  <input type="checkbox" checked={maintenanceDeviceIds.includes(device.id)}
                    onChange={event => { setMaintenanceDeviceIds(value => event.target.checked ? [...value, device.id] :
                      value.filter(item => item !== device.id)); setSubmissionKey(""); }} />
                  {device.model} — {device.serial}
                </label>)}
              {devices.length === 100 && <p>Affichage limité aux 100 premiers appareils.</p>}
            </fieldset>}
            <label className="block">Objet<input className="w-full p-2 border rounded" value={subject} required maxLength={200}
              onChange={event => { setSubject(event.target.value); setSubmissionKey(""); }} /></label>
            <label className="block">Votre message{pendingDiagnostic && requestType === "sav" ? " (facultatif)" : ""}<textarea className="w-full p-2 border rounded" value={message}
              required={!(pendingDiagnostic && requestType === "sav")} maxLength={5000}
              onChange={event => { setMessage(event.target.value); setSubmissionKey(""); }} /></label>
            {creationError && <p role="alert">{creationError}</p>}
            {saved && <p role="status">Demande enregistrée. <Link className="underline" to={`${base}/requests/${saved.id}`}>Voir le détail</Link></p>}
            <button className="obera-btn-primary" type="submit" disabled={busy}>{busy ? "Enregistrement…" : "Envoyer la demande"}</button>
          </form>
        </section>
        <section id="mes-demandes" className="obera-panel p-5"><h2 className="text-xl font-semibold mb-3">Historique de mes demandes</h2>
          {requests.length === 0 ? <p>Aucune demande.</p> : <ul className="space-y-2">{requests.map(item =>
            <li key={item.id}><span>{requestTypeLabel(item.request_type)} — </span>
              <Link className="underline" to={`${base}/requests/${item.id}`}>{item.subject}</Link> — {publicStatusLabel(item.public_status)}</li>)}</ul>}
          {requests.length === 100 && <p>Affichage limité aux 100 dernières demandes.</p>}
        </section>
        <section id="mes-documents" className="obera-panel p-5"><h2 className="text-xl font-semibold mb-3">Documents partagés</h2>
          {documents.length === 0 ? <p>Aucun document partagé.</p> : <ul className="space-y-2">{documents.map(item =>
            <li key={item.id}><a className="underline" href={`${apiBase}/documents/${item.id}/content`}>{item.title}</a></li>)}</ul>}
          {documents.length === 100 && <p>Affichage limité aux 100 derniers documents.</p>}
        </section>
      </>}
    </main>
  </div>;
}

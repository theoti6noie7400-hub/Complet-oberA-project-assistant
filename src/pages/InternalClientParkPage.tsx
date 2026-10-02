import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import PortalTopBar from "../components/PortalTopBar";
import { ClientDevicePhoto, type ClientDevice } from "../components/ClientPark";
import { useAdminAuth } from "../auth/adminAuth";

type Client = { id: string; name: string; external_reference: string | null; device_count: number };

async function read<T>(path: string): Promise<T> {
  const response = await fetch(path, { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) throw new Error(response.status === 401 ? "Session expirée. Reconnectez-vous." :
    "Consultation indisponible. Réessayez.");
  return response.json() as Promise<T>;
}

export default function InternalClientParkPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Client | null>(null);
  const [devices, setDevices] = useState<ClientDevice[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const selection = useRef(0);
  const { role } = useAdminAuth();
  const preview = useLocation().pathname === "/sav-maintenance/client-preview";

  useEffect(() => {
    let active = true;
    read<{ clients: Client[] }>("/api/sav/clients")
      .then(data => { if (active) setClients(data.clients); })
      .catch(reason => { if (active) setError(reason.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function select(client: Client) {
    const current = ++selection.current;
    setSelected(client); setDevices([]); setError("");
    try {
      const data = await read<{ devices: ClientDevice[] }>(`/api/sav/clients/${client.id}/devices`);
      if (current === selection.current) setDevices(data.devices);
    } catch (reason) { if (current === selection.current) setError((reason as Error).message); }
  }

  const found = clients.filter(client => [client.name, client.external_reference ?? ""]
    .some(text => text.toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr"))));
  return <div className="portal-page"><PortalTopBar subtitle="Parc Client — usage interne"
    showInternalLink={role !== "commercial"} />
    <main className="portal-main space-y-5">
      <Link className="underline" to="/">Retour au portail</Link>
      {preview && <p className="obera-panel p-4 font-semibold">APERÇU CLIENT — USAGE INTERNE OBERA</p>}
      <section className="obera-panel p-5 space-y-3">
        <h1 className="text-2xl font-semibold">Clients et parc appareils</h1>
        <p>Consultation interne OberA. Les notices sont accessibles uniquement après contrôle de la session.</p>
        <label className="block">Rechercher un client
          <input className="block w-full max-w-lg p-2 border rounded" value={query}
            onChange={event => setQuery(event.target.value)} /></label>
        {loading && <p role="status">Chargement…</p>}
        {error && <p role="alert">{error}</p>}
        {!loading && !error && found.length === 0 && <p>Aucun client trouvé.</p>}
        <ul className="space-y-2">{found.map(client => <li key={client.id}>
          <button className="obera-btn-outline" type="button" onClick={() => void select(client)}>
            {client.name} — {client.device_count} appareil(s)
          </button>
        </li>)}</ul>
      </section>
      {selected && <section className="obera-panel p-5 space-y-4">
        <h2 className="text-xl font-semibold">Parc de {selected.name}</h2>
        {devices.length === 0 && !error && <p>Aucun appareil enregistré.</p>}
        <ul className="client-device-grid">{devices.map(device => <li className="client-device-card" key={device.id}>
          <ClientDevicePhoto model={device.model} />
          <div className="space-y-2"><h3 className="font-semibold text-lg">{device.model}</h3>
            <p>Numéro de série : <strong>{device.serial}</strong></p>
            <div className="client-device-actions">
              <Link className="obera-btn-primary" to={`/sav-maintenance/clients/${selected.id}/devices/${device.id}`}>
                Tester l’espace Client</Link>
              {role !== "commercial" && <Link className="obera-btn-outline" to="/sav-maintenance">
                Accéder au diagnostic SAV (choisir ce modèle)</Link>}
              {device.notice_available ? <a className="obera-btn-outline"
                href={`/api/sav/devices/${device.id}/notice`}>Télécharger la notice</a> :
                <span>Notice indisponible</span>}
            </div>
          </div>
        </li>)}</ul>
      </section>}
    </main>
  </div>;
}

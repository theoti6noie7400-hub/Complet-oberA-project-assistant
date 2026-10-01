import { useState } from "react";
import { Link } from "react-router-dom";
import { CATEGORIES, PRODUCTS, getImageUrl } from "../lib/assistantData";
import { clientProductForModel, clientProductPhoto } from "../lib/clientProductMedia";

export type ClientDevice = { id: string; model: string; serial: string; notice_available?: boolean };

function Photo({ model }: { model: string }) {
  const [failed, setFailed] = useState(false);
  const image = clientProductPhoto(model);
  if (!image || failed) return <div className="client-device-photo client-device-placeholder" role="img"
    aria-label={`Photo indisponible pour ${model}`}>OberA<br /><small>Photo indisponible</small></div>;
  return <img className="client-device-photo" src={getImageUrl(image) ?? undefined}
    alt={`Photo du modèle ${model}`} onError={() => setFailed(true)} />;
}

export function ClientPark({ devices, base }: { devices: ClientDevice[]; base: string }) {
  return <section id="mes-appareils" className="obera-panel p-5 space-y-4">
    <div><h2 className="text-xl font-semibold">Mes appareils</h2>
      <p>Les équipements rattachés à votre organisation et leurs services.</p></div>
    {devices.length === 0 ? <p>Aucun appareil enregistré.</p> :
      <ul className="client-device-grid">{devices.map(device =>
        <li className="client-device-card" key={device.id}>
          <Photo model={device.model} />
          <div className="space-y-2 min-w-0"><h3 className="font-semibold text-lg">{device.model}</h3>
            <p>Numéro de série : <strong>{device.serial}</strong></p>
            <div className="client-device-actions">
              <Link className="obera-btn-outline" to={`${base}/devices/${device.id}`}>Voir l’appareil</Link>
              <Link className="obera-btn-outline" to={`${base}/diagnostic/${device.id}`}>Diagnostic</Link>
              <Link className="obera-btn-outline" to={`${base}?type=sav&device=${device.id}#nouvelle-demande`}>Créer une demande SAV</Link>
              <Link className="obera-btn-outline" to={`${base}?type=consumables&device=${device.id}#nouvelle-demande`}>Demander des consommables</Link>
              {device.notice_available ? <a className="obera-btn-outline" href={`/api/client/devices/${device.id}/notice`}>Télécharger la notice</a> :
                <span className="text-sm text-slate-600">Notice indisponible</span>}
            </div>
          </div>
        </li>)}</ul>}
    {devices.length === 100 && <p>Affichage limité aux 100 premiers appareils.</p>}
  </section>;
}

export function ClientDiagnosticSelector({ devices, base }: { devices: ClientDevice[]; base: string }) {
  return <section id="diagnostic-parc" className="obera-panel p-5 space-y-3">
    <h2 className="text-xl font-semibold">Diagnostic de mon parc</h2>
    <p>Seuls les modèles présents dans les équipements de votre société sont accessibles.</p>
    <div className="client-category-grid">{CATEGORIES.map(category => {
      const categoryDevices = devices.filter(device => clientProductForModel(device.model)?.category === category.id);
      const active = categoryDevices.length > 0;
      return <details key={category.id} className="client-category" aria-disabled={!active}>
        <summary aria-disabled={!active} className={active ? "cursor-pointer font-semibold" : "text-slate-500 cursor-not-allowed"}
          onClick={event => { if (!active) event.preventDefault(); }}>
          {category.icon} {category.label} {active ? `(${categoryDevices.length})` : "— aucun appareil"}</summary>
        {active && <ul className="mt-3 space-y-2">{PRODUCTS.filter(product => product.category === category.id).map(product => {
          const owned = categoryDevices.filter(device => clientProductForModel(device.model)?.id === product.id);
          return <li key={product.id}>
            {owned.length ? <><strong>{product.name}</strong> : {owned.map(device =>
              <Link key={device.id} className="underline ml-2" to={`${base}/diagnostic/${device.id}`}>
                {device.serial}</Link>)}</> : <span className="text-slate-500" aria-disabled="true">{product.name} — non présent dans mon parc</span>}
          </li>;
        })}</ul>}
      </details>;
    })}</div>
  </section>;
}

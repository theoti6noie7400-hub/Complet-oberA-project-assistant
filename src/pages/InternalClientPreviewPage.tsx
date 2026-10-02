import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PortalTopBar from "../components/PortalTopBar";
import { ClientDevicePhoto, type ClientDevice } from "../components/ClientPark";
import { ExternalDiagnostic } from "./ExternalSpacePage";
import { useAdminAuth } from "../auth/adminAuth";

type Detail = { organization: { id: string; name: string }; device: ClientDevice };

export default function InternalClientPreviewPage() {
  const { clientId, deviceId } = useParams();
  const { role } = useAdminAuth();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setDetail(null); setError("");
    fetch(`/api/sav/clients/${encodeURIComponent(clientId ?? "")}/devices/${encodeURIComponent(deviceId ?? "")}`,
      { credentials: "same-origin", cache: "no-store" })
      .then(response => {
        if (!response.ok) throw new Error(response.status === 404 ? "Appareil introuvable ou non accessible." :
          "Session ou consultation indisponible.");
        return response.json() as Promise<Detail>;
      })
      .then(value => { if (active) setDetail(value); })
      .catch(reason => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [clientId, deviceId]);

  return <div className="portal-page"><PortalTopBar subtitle="Aperçu Client — interne OberA"
    showInternalLink={role !== "commercial"} />
    <main className="portal-main space-y-5">
      <p className="obera-panel p-4 font-semibold">APERÇU CLIENT — USAGE INTERNE OBERA</p>
      <Link className="underline" to="/sav-maintenance/clients">Retour au parc clients</Link>
      {error && <p role="alert">{error}</p>}
      {!detail && !error && <p role="status">Chargement de l’appareil…</p>}
      {detail && <>
        <section className="obera-panel p-5 space-y-3">
          <h1 className="text-2xl font-semibold">{detail.organization.name} — {detail.device.model}</h1>
          <ClientDevicePhoto model={detail.device.model} detail />
          <p>Numéro de série : <strong>{detail.device.serial}</strong></p>
          {detail.device.notice_available ? <a className="obera-btn-outline inline-flex"
            href={`/api/sav/devices/${detail.device.id}/notice`}>Télécharger la notice</a> :
            <p>Notice indisponible</p>}
        </section>
        <ExternalDiagnostic key={detail.device.id} device={detail.device} base="/sav-maintenance/clients"
          organizationId={detail.organization.id} preview returnTo="/sav-maintenance/clients" />
      </>}
    </main>
  </div>;
}

import { Link, useParams } from "react-router-dom";
import PortalTopBar from "../components/PortalTopBar";

const SERVICE_TITLES: Record<string, string> = {
  marketing: "Marketing",
  commercial: "Commercial",
  adv: "ADV",
  logistique: "Logistique",
  "espace-client": "Espace Client",
  "espace-revendeur": "Espace Revendeur"
};

const SERVICE_DESCRIPTIONS: Record<string, string> = {
  marketing: "Espace en preparation pour les operations et contenus marketing.",
  commercial: "Espace en preparation pour le pilotage commercial OberA.",
  adv: "Espace en preparation pour l'administration des ventes.",
  logistique: "Espace en preparation pour la coordination logistique.",
  "espace-client":
    "Espace en preparation pour les donnees client (parc, maintenance, documents).",
  "espace-revendeur":
    "Espace en preparation pour l'activite revendeur et les commandes de pieces."
};

export default function ServicePlaceholderPage() {
  const { serviceKey = "" } = useParams();
  const title = SERVICE_TITLES[serviceKey] ?? "Service";
  const description =
    SERVICE_DESCRIPTIONS[serviceKey] ??
    "Cette section sera disponible dans une prochaine version du Portail OberA.";

  return (
    <div className="portal-page">
      <PortalTopBar />

      <main className="portal-main">
        <section className="portal-placeholder obera-panel">
          <p className="portal-placeholder-kicker">Bientot disponible</p>
          <h1 className="portal-placeholder-title">{title}</h1>
          <p className="portal-placeholder-desc">{description}</p>

          <div className="portal-placeholder-actions">
            <Link to="/" className="obera-btn-primary">
              Retour Portail
            </Link>
            <Link to="/sav-maintenance" className="obera-btn-outline">
              Aller au SAV / Maintenance
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}


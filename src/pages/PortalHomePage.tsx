import { Link } from "react-router-dom";
import PortalTopBar from "../components/PortalTopBar";

type PortalTile = {
  id: string;
  title: string;
  description: string;
  icon: string;
  to: string;
};

const PORTAL_TILES: PortalTile[] = [
  {
    id: "sav-maintenance",
    title: "SAV / Maintenance",
    description: "Diagnostic, tickets SAV et suivi maintenance.",
    icon: "🛠️",
    to: "/sav-maintenance"
  },
  {
    id: "marketing",
    title: "Marketing",
    description: "Supports, contenus et actions marketing OberA.",
    icon: "📣",
    to: "/service/marketing"
  },
  {
    id: "commercial",
    title: "Commercial",
    description: "Pilotage commercial, offres et suivi clients.",
    icon: "🤝",
    to: "/service/commercial"
  },
  {
    id: "adv",
    title: "ADV",
    description: "Administration des ventes et suivi administratif.",
    icon: "🧾",
    to: "/service/adv"
  },
  {
    id: "logistique",
    title: "Logistique",
    description: "Flux, expeditions et coordination logistique.",
    icon: "🚚",
    to: "/service/logistique"
  },
  {
    id: "espace-client",
    title: "Espace Client",
    description: "Acces client au parc machines et documents.",
    icon: "🏭",
    to: "/client-space"
  },
  {
    id: "espace-revendeur",
    title: "Espace Revendeur",
    description: "Commandes de pieces et suivi revendeur.",
    icon: "📦",
    to: "/service/espace-revendeur"
  }
];

export default function PortalHomePage() {
  return (
    <div className="portal-page">
      <PortalTopBar subtitle="Acces centralise aux outils et services" />

      <main className="portal-main">
        <section className="portal-grid" aria-label="Sections du Portail OberA">
          {PORTAL_TILES.map((tile) => (
            <article key={tile.id} className="portal-card obera-panel">
              <div className="portal-card-icon" aria-hidden="true">
                {tile.icon}
              </div>
              <h2 className="portal-card-title">{tile.title}</h2>
              <p className="portal-card-desc">{tile.description}</p>
              <Link to={tile.to} className="obera-btn-primary portal-card-cta">
                Acceder
              </Link>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}

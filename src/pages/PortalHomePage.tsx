import { Link } from "react-router-dom";
import PortalTopBar from "../components/PortalTopBar";
import { CLIENT_SECTION, INTERNAL_SECTIONS, RESELLER_SECTION } from "../portal/sections";

const PORTAL_TILES = [
  {
    id: "sav-maintenance",
    title: "SAV / Maintenance",
    description: "Diagnostic, tickets SAV et suivi maintenance.",
    icon: "🛠️",
    to: "/sav-maintenance"
  },
  ...INTERNAL_SECTIONS.map((section) => ({
    id: section.id,
    title: section.title,
    description: section.description,
    icon: section.icon,
    to: section.route
  })),
  {
    id: CLIENT_SECTION.id,
    title: CLIENT_SECTION.title,
    description: CLIENT_SECTION.description,
    icon: CLIENT_SECTION.icon,
    to: CLIENT_SECTION.route
  },
  {
    id: RESELLER_SECTION.id,
    title: RESELLER_SECTION.title,
    description: RESELLER_SECTION.description,
    icon: RESELLER_SECTION.icon,
    to: RESELLER_SECTION.route
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

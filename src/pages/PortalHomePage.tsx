import { Link } from "react-router-dom";
import PortalTopBar from "../components/PortalTopBar";
import { canUseInternalPath, useAdminAuth } from "../auth/adminAuth";

const PORTAL_TILES = [
  {
    id: "sav-maintenance",
    title: "SAV / Maintenance",
    description: "Diagnostic, tickets SAV et suivi maintenance.",
    icon: "🛠️",
    to: "/sav-maintenance"
  }
];

export default function PortalHomePage() {
  const { isAuthenticated, role } = useAdminAuth();
  const tiles = isAuthenticated ? PORTAL_TILES.filter(tile => canUseInternalPath(role, tile.to)) : PORTAL_TILES;
  return (
    <div className="portal-page">
      <PortalTopBar subtitle="Outil interne SAV OberA"
        showInternalLink={!isAuthenticated || canUseInternalPath(role, "/sav-maintenance")} />

      <main className="portal-main">
        <section className="portal-grid" aria-label="Sections du Portail OberA">
          {tiles.map((tile) => (
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
        {tiles.length === 0 && <p className="obera-panel p-5">
          Aucun espace SAV disponible pour cette session.
        </p>}
      </main>
    </div>
  );
}

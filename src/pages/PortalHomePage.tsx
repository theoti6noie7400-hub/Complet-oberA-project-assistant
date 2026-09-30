import { Link } from "react-router-dom";
import PortalTopBar from "../components/PortalTopBar";
import { canUseInternalPath, useAdminAuth } from "../auth/adminAuth";
import { CLIENT_SECTION } from "../portal/sections";

const PORTAL_TILES = [
  {
    id: "sav-maintenance",
    title: "SAV / Maintenance",
    description: "Diagnostic, tickets SAV et suivi maintenance.",
    icon: "🛠️",
    to: "/sav-maintenance"
  },
  {
    id: CLIENT_SECTION.id,
    title: CLIENT_SECTION.title,
    description: CLIENT_SECTION.description,
    icon: CLIENT_SECTION.icon,
    to: CLIENT_SECTION.route
  }
];

export default function PortalHomePage() {
  const { isAuthenticated, role, externalRole } = useAdminAuth();
  const tiles = externalRole ? PORTAL_TILES.filter(tile => externalRole === "client" && tile.to === "/client-space") :
    isAuthenticated ? PORTAL_TILES.filter(tile => canUseInternalPath(role, tile.to)) : PORTAL_TILES;
  return (
    <div className="portal-page">
      <PortalTopBar subtitle="Accès SAV et service client"
        showInternalLink={!externalRole && (!isAuthenticated || canUseInternalPath(role, "/sav-maintenance"))} />

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
          Aucun espace disponible pour cette session dans le portail SAV / service client.
          {externalRole === "reseller" && <> <Link to="/reseller-space" className="underline">Gérer la session</Link></>}
        </p>}
      </main>
    </div>
  );
}

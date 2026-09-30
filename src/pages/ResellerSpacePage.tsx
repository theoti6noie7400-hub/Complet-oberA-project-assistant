import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../auth/adminAuth";
import PortalTopBar from "../components/PortalTopBar";

export default function ResellerSpacePage() {
  const { externalRole, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [logoutError, setLogoutError] = useState(false);
  return <div className="portal-page">
    <PortalTopBar subtitle="Espace Revendeur" showInternalLink={false} />
    <main className="portal-main">
      <section className="portal-placeholder obera-panel">
        <h1 className="portal-placeholder-title">Espace Revendeur indisponible</h1>
        <p className="portal-placeholder-desc">
          Cet espace n'est plus disponible dans le portail SAV / service client.
        </p>
        <div className="portal-placeholder-actions">
          <Link to="/" className="obera-btn-primary">Retour au portail</Link>
          {externalRole === "reseller" && <button type="button" className="obera-btn-outline"
            onClick={async () => {
              if (await logout()) navigate("/", { replace: true });
              else setLogoutError(true);
            }}>Déconnexion</button>}
        </div>
        {logoutError && <p role="alert">Déconnexion impossible. Réessayez.</p>}
      </section>
    </main>
  </div>;
}

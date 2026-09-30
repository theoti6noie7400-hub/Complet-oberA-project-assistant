import { Link, useParams } from "react-router-dom";
import PortalTopBar from "../components/PortalTopBar";
import { INTERNAL_SECTIONS } from "../portal/sections";

export default function ServiceHubPage() {
  const { serviceKey = "" } = useParams();
  const section = INTERNAL_SECTIONS.find((item) => item.id === serviceKey);

  return (
    <div className="portal-page">
      <PortalTopBar subtitle={section?.title ?? "Service"} showInternalLink={false} />
      <main className="portal-main">
        <section className="portal-placeholder obera-panel">
          <h1 className="portal-placeholder-title">{section?.title ?? "Service"}</h1>
          <p className="portal-placeholder-desc">
            Cet espace n'est plus disponible dans le portail SAV / service client.
          </p>
          <div className="portal-placeholder-actions">
            <Link to="/" className="obera-btn-primary">Retour au portail</Link>
          </div>
        </section>
      </main>
    </div>
  );
}

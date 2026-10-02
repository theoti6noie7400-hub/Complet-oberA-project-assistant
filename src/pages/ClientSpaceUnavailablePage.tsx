import { Link } from "react-router-dom";
import PortalTopBar from "../components/PortalTopBar";

export default function ClientSpaceUnavailablePage() {
  return <div className="portal-page">
    <PortalTopBar subtitle="Outil interne SAV" />
    <main className="portal-main"><section className="obera-panel p-6 space-y-3">
      <h1 className="text-2xl font-semibold">Espace Client indisponible en V1</h1>
      <p>Cette version du portail est réservée à l'équipe SAV OberA.</p>
      <Link className="obera-btn-primary inline-flex" to="/">Retour au portail</Link>
    </section></main>
  </div>;
}

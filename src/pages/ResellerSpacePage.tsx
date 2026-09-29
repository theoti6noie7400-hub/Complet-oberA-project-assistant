import { Link } from "react-router-dom";
import PortalTopBar from "../components/PortalTopBar";

export default function ResellerSpacePage() {
  return (
    <div className="portal-page">
      <PortalTopBar subtitle="Espace Revendeur" />
      <main className="portal-main space-y-6">
        <section className="obera-panel p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Espace revendeur</p>
          <h1 className="text-2xl font-semibold text-stone-800">Commande de consommables</h1>
          <p className="text-sm text-stone-600 mt-1">
            Passez vos commandes et suivez vos demandes de consommables OberA.
          </p>
          <p role="status" className="mt-4 text-sm text-stone-700">
            Espace temporairement indisponible pendant la bêta interne.
          </p>
          <Link to="/" className="obera-btn-outline mt-4 inline-flex">Retour Portail</Link>
        </section>
        <section className="portal-grid">
          {[
            { title: "Catalogue consommables", description: "Filtres, cartouches, accessoires et references." },
            { title: "Tarifs revendeur", description: "Conditions et remises appliquees." },
            { title: "Historique commandes", description: "Historique et tracking." },
            { title: "Support revendeur", description: "Assistance et documentation." }
          ].map(item => (
            <article key={item.title} className="portal-card obera-panel">
              <h2 className="portal-card-title">{item.title}</h2>
              <p className="portal-card-desc">{item.description}</p>
              <span className="portal-card-status">Bientot disponible</span>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}

import { FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PortalTopBar from "../components/PortalTopBar";

const RESELLER_IDS = ["REVENDEUR", "OBERAREVENDEUR"];
const RESELLER_PIN = "1234";

function withBase(path: string): string {
  const base = (import.meta as any).env?.BASE_URL ?? "/";
  const prefix = base.endsWith("/") ? base : `${base}/`;
  return `${prefix}${path.replace(/^\/+/, "")}`;
}

export default function ResellerSpacePage() {
  const logoSrc = useMemo(() => withBase("obera-logo.png"), []);
  const [logoFailed, setLogoFailed] = useState(false);
  const [resellerId, setResellerId] = useState("");
  const [pin, setPin] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const cleanId = resellerId.trim().toUpperCase();
    const ok = RESELLER_IDS.includes(cleanId) && pin.trim() === RESELLER_PIN;
    setError(!ok);
    setAuthenticated(ok);
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-stone-100">
        <div className="w-full max-w-md rounded-xl bg-white shadow-lg p-8">
          <div className="text-center mb-8">
            {!logoFailed ? (
              <img
                src={logoSrc}
                alt="OberA"
                className="logo-img mx-auto"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <div className="logo-fallback">
                ober<span className="logo-fallback-accent">A</span>
              </div>
            )}
            <p className="mt-3 text-sm text-stone-500">Connexion espace revendeur</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Identifiant revendeur
              </label>
              <input
                type="text"
                className="w-full p-3 rounded-md border border-stone-300"
                placeholder="Ex: REVENDEUR"
                value={resellerId}
                onChange={(e) => setResellerId(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Code PIN
              </label>
              <input
                type="password"
                className="w-full p-3 rounded-md border border-stone-300"
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                inputMode="numeric"
                maxLength={4}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-red-600">
                Identifiant revendeur ou code PIN incorrect.
              </p>
            )}
            <button
              type="submit"
              className="w-full px-6 py-3 text-white rounded-lg shadow-md transition obera-blue obera-blue-hover"
            >
              Acceder
            </button>
          </form>

          <div className="mt-5 text-center">
            <Link to="/" className="text-sm text-stone-600 hover:underline">
              Retour Portail
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-page">
      <PortalTopBar subtitle="Espace Revendeur" />
      <main className="portal-main space-y-6">
        <section className="obera-panel p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Espace revendeur</p>
          <h1 className="text-2xl font-semibold text-stone-800">
            Commande de consommables
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Passez vos commandes et suivez vos demandes de consommables OberA.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="obera-btn-primary" type="button">
              Nouvelle commande
            </button>
            <button className="obera-btn-outline" type="button">
              Suivi des commandes
            </button>
          </div>
        </section>

        <section className="portal-grid">
          {[
            {
              title: "Catalogue consommables",
              description: "Filtres, cartouches, accessoires et references.",
              status: "Bientot disponible"
            },
            {
              title: "Tarifs revendeur",
              description: "Conditions et remises appliquees.",
              status: "Bientot disponible"
            },
            {
              title: "Historique commandes",
              description: "Historique et tracking.",
              status: "Bientot disponible"
            },
            {
              title: "Support revendeur",
              description: "Assistance et documentation.",
              status: "Bientot disponible"
            }
          ].map((item) => (
            <article key={item.title} className="portal-card obera-panel">
              <h2 className="portal-card-title">{item.title}</h2>
              <p className="portal-card-desc">{item.description}</p>
              <span className="portal-card-status">{item.status}</span>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}


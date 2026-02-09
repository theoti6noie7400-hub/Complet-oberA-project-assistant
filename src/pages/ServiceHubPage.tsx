import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import PortalTopBar from "../components/PortalTopBar";
import { INTERNAL_SECTIONS } from "../portal/sections";
import { useAdminAuth } from "../auth/adminAuth";

export default function ServiceHubPage() {
  const { serviceKey = "" } = useParams();
  const { role, serviceKey: adminService } = useAdminAuth();

  const section = useMemo(
    () => INTERNAL_SECTIONS.find((s) => s.id === serviceKey),
    [serviceKey]
  );

  if (!section) {
    return (
      <div className="portal-page">
        <PortalTopBar />
        <main className="portal-main">
          <section className="portal-placeholder obera-panel">
            <p className="portal-placeholder-kicker">Bientot disponible</p>
            <h1 className="portal-placeholder-title">Service</h1>
            <p className="portal-placeholder-desc">
              Cette section sera disponible dans une prochaine version du Portail OberA.
            </p>
            <div className="portal-placeholder-actions">
              <Link to="/" className="obera-btn-primary">
                Retour Portail
              </Link>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const canEdit = role === "global" || (role === "service" && adminService === section.id);

  return (
    <div className="portal-page">
      <PortalTopBar subtitle={section.title} />
      <main className="portal-main space-y-6">
        <section className="obera-panel p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Espace</p>
              <h1 className="text-2xl font-semibold text-stone-800">{section.title}</h1>
              <p className="text-sm text-stone-600 mt-1">{section.description}</p>
            </div>
            <div className={`portal-permission ${canEdit ? "is-edit" : "is-read"}`}>
              {canEdit ? "Edition autorisee" : "Lecture seule"}
            </div>
          </div>
        </section>

        <section className="portal-grid">
          {section.menu.map((item) => (
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


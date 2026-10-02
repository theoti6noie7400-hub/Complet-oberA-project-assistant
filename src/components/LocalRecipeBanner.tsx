import { useEffect, useState } from "react";
import type { ReactNode } from "react";

export default function LocalRecipeBanner({ children }: { children?: ReactNode }) {
  const [privateDataLoaded, setPrivateDataLoaded] = useState(false);
  useEffect(() => {
    fetch("/api/local-recipe/info", { credentials: "same-origin" })
      .then(response => response.ok ? response.json() : null)
      .then(value => setPrivateDataLoaded(value?.private_data_loaded === true))
      .catch(() => {});
  }, []);
  async function reset() {
    const response = await fetch("/api/local-recipe/reset", { method: "POST", credentials: "same-origin" });
    if (!response.ok) { window.alert("Réinitialisation indisponible. Réessayez."); return; }
    sessionStorage.clear();
    window.location.assign("/");
  }

  return <aside role="status" aria-label="Mode recette locale"
    className="local-recipe-banner"
    style={{ position: "sticky", top: 0, zIndex: 200, background: "#7f1d1d", color: "white",
      padding: "0.5rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: "0.75rem", flexWrap: "wrap", fontWeight: 700 }}>
    <span>RECETTE INTERNE — DONNÉES DE TEST / CLIENT PRIVÉES — NE PAS DIFFUSER
      {privateDataLoaded && " — DONNÉES PRIVÉES IMPORTÉES"}</span>
    <div className="local-recipe-controls">{children}<button type="button" onClick={reset}
      style={{ background: "white", color: "#7f1d1d", borderRadius: "0.3rem", padding: "0.35rem 0.7rem" }}>
      Réinitialiser les données DEMO
    </button></div>
  </aside>;
}

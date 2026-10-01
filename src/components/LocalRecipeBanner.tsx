export default function LocalRecipeBanner() {
  async function reset() {
    const response = await fetch("/api/local-recipe/reset", { method: "POST", credentials: "same-origin" });
    if (!response.ok) { window.alert("Réinitialisation indisponible. Réessayez."); return; }
    sessionStorage.clear();
    window.location.assign("/");
  }

  return <aside role="status" aria-label="Mode recette locale"
    style={{ position: "sticky", top: 0, zIndex: 200, background: "#7f1d1d", color: "white",
      padding: "0.5rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: "0.75rem", flexWrap: "wrap", fontWeight: 700 }}>
    <span>MODE RECETTE LOCALE — DONNÉES FICTIVES</span>
    <button type="button" onClick={reset}
      style={{ background: "white", color: "#7f1d1d", borderRadius: "0.3rem", padding: "0.35rem 0.7rem" }}>
      Réinitialiser les données DEMO
    </button>
  </aside>;
}

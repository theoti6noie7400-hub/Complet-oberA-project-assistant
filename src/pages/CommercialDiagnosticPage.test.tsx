// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CommercialDiagnosticPage from "./CommercialDiagnosticPage";
import { IC22_ERROR_MEANINGS, IC22_OPENING_VIDEO_URL, IC22_NOISE_TYPES } from "../lib/ic22Diagnostic";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn((url: string) => Promise.resolve(Response.json(
    { models: ["IC 22"] }
  ))));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const page = () => render(<MemoryRouter><CommercialDiagnosticPage /></MemoryRouter>);
function select(view: ReturnType<typeof page>, model = "IC 22") {
  fireEvent.change(view.getByLabelText("Rechercher un appareil"), { target: { value: model } });
  fireEvent.click(view.getByRole("button", { name: "Lancer le diagnostic" }));
}
function choose(view: ReturnType<typeof page>, label: string) {
  const matches = view.getAllByRole("button", { name: label });
  fireEvent.click(matches[0]);
}
function continueControl(view: ReturnType<typeof page>) {
  fireEvent.click(view.getByLabelText("Je confirme avoir effectué le contrôle proposé."));
  fireEvent.click(view.getByRole("button", { name: "Continuer" }));
}
function steadyCircuit(view: ReturnType<typeof page>) {
  choose(view, "L’appareil ne fait pas de froid");
  choose(view, "Oui");
  choose(view, "Oui");
  choose(view, "Il reste fixe");
}
function pumpObservation(view: ReturnType<typeof page>) {
  steadyCircuit(view);
  continueControl(view);
  choose(view, "Tuyaux et connecteur visiblement raccordés, aucune anomalie simple");
  expect(view.queryByLabelText("Je confirme avoir effectué le contrôle proposé.")).toBeNull();
  fireEvent.click(view.getByRole("button", { name: "Continuer" }));
  choose(view, "Oui, continuer");
}

it("montre neuf symptômes et le contact SAV immédiat sans transport ni données Client", () => {
  const view = page(); select(view, "VL 220");
  expect(view.getByRole("heading", { name: "IC 22 / KM 22 / VL 220" })).toBeTruthy();
  expect(view.getByRole("heading", { name: "Quel problème constatez-vous sur votre appareil ?" })).toBeTruthy();
  const buttons = ["L’appareil ne fait pas de froid", "L’appareil ne s’allume pas",
    "L’appareil ne souffle pas ou souffle faiblement", "L’appareil fuit",
    "L’oscillation ne fonctionne pas", "L’appareil fait un bruit anormal",
    "Un code d’erreur s’affiche", "L’appareil dégage une mauvaise odeur", "Autre problème"];
  for (const label of buttons) expect(view.getByRole("button", { name: label })).toBeTruthy();
  expect(view.queryByText(/transport/i)).toBeNull();
  choose(view, "Contacter le SAV");
  const form = view.getByRole("form", { name: "Contacter le SAV" });
  expect(within(form).getByLabelText("Société / client")).toHaveProperty("value", "");
  expect(view.queryByText(/numéro de série|parc client|dossier SAV/i)).toBeNull();
});

it("garde les autres familles et l’accès SAV direct aux modèles absents", () => {
  const view = page();
  fireEvent.change(view.getByLabelText("Rechercher un appareil"), { target: { value: "IC 12" } });
  expect(view.getByRole("heading", { name: "IC 12 / KM 12 / VL 120" })).toBeTruthy();
  fireEvent.change(view.getByLabelText("Rechercher un appareil"), { target: { value: "ECOCLIM" } });
  expect(view.getByText("Aucun appareil trouvé.")).toBeTruthy();
  choose(view, "Contacter le SAV");
  expect(view.getByRole("form", { name: "Contacter le SAV" })).toBeTruthy();
});

it("sépare voyant clignotant et fixe et n’utilise pas la vidange pour le flotteur", () => {
  const view = page(); select(view);
  choose(view, "L’appareil ne fait pas de froid");
  choose(view, "Oui"); choose(view, "Oui"); choose(view, "Il clignote");
  expect(view.getByRole("heading", { name: "Le niveau d’eau est-il suffisant ?" })).toBeTruthy();
  expect(view.queryByText(/vidange/i)).toBeNull();
  choose(view, "Oui");
  expect(view.getByRole("link", { name: /vidéo d’ouverture/ }).getAttribute("href"))
    .toBe(IC22_OPENING_VIDEO_URL);
  continueControl(view);
  choose(view, "Non / je ne peux pas l’identifier sûrement");
  expect(view.getByText(/Aucune panne du capteur n’est affirmée/)).toBeTruthy();
});

it("refroidissement non activable et aucun souffle alimenté mènent directement au SAV", () => {
  const view = page(); select(view);
  choose(view, "L’appareil ne fait pas de froid"); choose(view, "Oui"); choose(view, "Non");
  continueControl(view); choose(view, "Non");
  expect(view.getByRole("heading", { name: "Contacter le SAV" })).toBeTruthy();
  choose(view, "Étape précédente"); choose(view, "Étape précédente");
  choose(view, "Étape précédente"); choose(view, "Étape précédente");
  choose(view, "Étape précédente");
  choose(view, "L’appareil ne souffle pas ou souffle faiblement");
  choose(view, "Aucun souffle");
  expect(view.getByRole("button", { name: "Je ne sais pas" })).toBeTruthy();
  choose(view, "Oui");
  expect(view.getByText(/Aucune panne de moteur ou de carte n’est déduite/)).toBeTruthy();
});

it("propose la demande de pompe sans PDF et préremplit le parcours", () => {
  const view = page(); select(view);
  pumpObservation(view);
  choose(view, "La pompe ne fonctionne pas");
  expect(view.getByRole("heading", { name: "Pompe à remplacer" })).toBeTruthy();
  expect(view.queryByLabelText("Je confirme avoir effectué le contrôle proposé.")).toBeNull();
  expect(view.queryByText(/PDF|personne autorisée|personne habilitée/i)).toBeNull();
  expect(view.getAllByRole("button", { name: "Contacter le SAV" }).length).toBeGreaterThan(0);
  choose(view, "Demander une pompe de remplacement");
  const form = view.getByRole("form", { name: "Contacter le SAV" });
  expect(within(form).getByLabelText("Contexte diagnostic prérempli")).toHaveProperty("value",
    expect.stringContaining("Conclusion : pompe à remplacer"));
  expect((within(form).getByLabelText("Contexte diagnostic prérempli") as HTMLTextAreaElement).value)
    .toMatch(/IC 22 \/ KM 22 \/ VL 220.*Parcours|IC 22 \/ KM 22 \/ VL 220[\s\S]*pompe de remplacement/);
});

it("oriente au SAV sans conclure sur la pompe si le contrôle visuel sous tension est refusé", () => {
  const view = page(); select(view); steadyCircuit(view);
  continueControl(view); choose(view, "Tuyaux et connecteur visiblement raccordés, aucune anomalie simple");
  expect(view.getByRole("heading", { name: "Contrôle visuel de la pompe sous tension" })).toBeTruthy();
  fireEvent.click(view.getByRole("button", { name: "Continuer" }));
  choose(view, "Non, contacter le SAV");
  expect(view.getByText(/Aucune panne de pompe n’est affirmée/)).toBeTruthy();
  expect(view.queryByText(/Pompe à remplacer/)).toBeNull();
});

it("n’utilise le test sans filtres que pour débit faible et prévoit remplacement jetable", () => {
  const view = page(); select(view);
  choose(view, "L’appareil ne souffle pas ou souffle faiblement"); choose(view, "Débit d’air faible");
  expect(view.getByText(/essai court sans filtres/)).toBeTruthy();
  continueControl(view); choose(view, "Oui");
  expect(view.getByText(/Ils sont jetables : remplacez-les/)).toBeTruthy();
  expect(view.getByText(/Ne les lavez pas/)).toBeTruthy();
});

it("montre le test du panneau comme confirmation et son information, sans réparation définitive", () => {
  const view = page(); select(view); choose(view, "L’appareil fuit");
  choose(view, "Panneau alvéolaire");
  expect(view.getByRole("link", { name: /vidéo d’ouverture/ })).toBeTruthy();
  expect(view.getByText(/retournement est un test, pas une réparation définitive/)).toBeTruthy();
  expect(view.getByText(/Pourquoi remplacer le panneau/)).toBeTruthy();
  continueControl(view); choose(view, "Oui");
  expect(view.getByRole("status").textContent).toContain("Remplacement du panneau à prévoir");
  expect(view.getByText(/remplacement est à prévoir/)).toBeTruthy();
});

it("transmet le code et la signification, ou le commentaire libre, au formulaire", () => {
  for (const [code, meaning] of Object.entries(IC22_ERROR_MEANINGS)) {
    const view = page(); select(view);
    choose(view, "Un code d’erreur s’affiche"); choose(view, code);
    expect(view.getByRole("heading", { name: `${code} — ${meaning}` })).toBeTruthy();
    choose(view, "Contacter le SAV");
    expect(view.getByText(/parcours déjà effectué sera ajouté/)).toBeTruthy();
    cleanup();
  }
  const other = page(); select(other); choose(other, "Autre problème");
  choose(other, "Contacter le SAV");
  expect(other.getByLabelText("Commentaire complémentaire")).toBeTruthy();
});

it("oriente odeur récente et persistante avec mention Probioway au SAV", () => {
  const view = page(); select(view); choose(view, "L’appareil dégage une mauvaise odeur");
  choose(view, "Oui");
  expect(view.queryByLabelText("Je confirme avoir effectué le contrôle proposé.")).toBeNull();
  fireEvent.click(view.getByRole("button", { name: "Continuer" })); choose(view, "Non");
  expect(view.getByText(/Probioway à envisager par le SAV/)).toBeTruthy();
  choose(view, "Contacter le SAV");
  expect(view.getByRole("form", { name: "Contacter le SAV" })).toBeTruthy();
});

it("panneau âgé : information visible, aucune confirmation ni retest après remplacement", () => {
  const view = page(); select(view);
  choose(view, "L’appareil dégage une mauvaise odeur"); choose(view, "Non");
  choose(view, "Oui"); choose(view, "Oui");
  expect(view.getByRole("heading", { name: "Remplacement du panneau conseillé" })).toBeTruthy();
  expect(view.getByText(/Pourquoi remplacer le panneau/)).toBeTruthy();
  expect(view.queryByLabelText("Je confirme avoir effectué le contrôle proposé.")).toBeNull();
  expect(view.queryByRole("button", { name: "Continuer" })).toBeNull();
  choose(view, "Contacter le SAV");
  expect(view.getByRole("form", { name: "Contacter le SAV" })).toBeTruthy();
  expect((view.getByLabelText("Contexte diagnostic prérempli") as HTMLTextAreaElement).value)
    .toContain("Odeur persistante — panneau de plus d’un an — remplacement conseillé.");
});

it("retrouve la famille commune avec les six alias IC22, KM22 et VL220", () => {
  const view = page();
  for (const alias of ["IC22", "IC 22", "KM22", "KM 22", "VL220", "VL 220"]) {
    fireEvent.change(view.getByLabelText("Rechercher un appareil"), { target: { value: alias } });
    expect(view.getByRole("heading", { name: "IC 22 / KM 22 / VL 220" })).toBeTruthy();
    expect(view.getAllByRole("button", { name: "Lancer le diagnostic" })).toHaveLength(1);
  }
});

it("Swing : confirme la remise en place hors tension et termine si le mouvement revient", () => {
  const view = page(); select(view); choose(view, "L’oscillation ne fonctionne pas");
  expect(view.getByRole("heading", { name: "Vérifier la liaison du swing" })).toBeTruthy();
  expect(view.getByRole("link", { name: /Agrandir la photo annotée/ })).toBeTruthy();
  continueControl(view);
  expect(view.queryByRole("button", { name: "Je ne peux pas le déterminer" })).toBeNull();
  choose(view, "La tige est déboîtée mais peut être remise en place");
  expect(view.getByText(/Appareil arrêté et débranché, remettez la tige/)).toBeTruthy();
  expect(view.getByRole("button", { name: "Continuer" })).toHaveProperty("disabled", true);
  continueControl(view); choose(view, "Oui");
  expect(view.getByRole("status").textContent).toBe("Problème résolu.");
  expect(view.queryByRole("button", { name: "Oui, le problème est résolu" })).toBeNull();
});

it("Swing : une liaison cassée va au SAV avec le constat exact et sans autre manipulation", () => {
  const view = page(); select(view); choose(view, "L’oscillation ne fonctionne pas");
  continueControl(view); choose(view, "La liaison est cassée ou endommagée");
  expect(view.queryByLabelText("Je confirme avoir effectué le contrôle proposé.")).toBeNull();
  expect(view.queryByRole("link", { name: /Agrandir la photo annotée/ })).toBeNull();
  choose(view, "Contacter le SAV");
  expect((view.getByLabelText("Contexte diagnostic prérempli") as HTMLTextAreaElement).value)
    .toContain("Liaison mécanique du swing cassée ou endommagée.");
});

it("Swing : les deux observations moteur vont au SAV, après contrôle ou remise en place infructueuse", () => {
  for (const reseated of [false, true]) for (const turns of [false, true]) {
    const view = page(); select(view); choose(view, "L’oscillation ne fonctionne pas");
    continueControl(view);
    choose(view, reseated ? "La tige est déboîtée mais peut être remise en place" : "La tige est correctement emboîtée");
    if (reseated) { continueControl(view); choose(view, "Non"); }
    expect(view.getByRole("heading", { name: "Contrôle visuel du moteur swing sous tension" })).toBeTruthy();
    expect(view.getByRole("link", { name: /Agrandir la photo annotée/ })).toBeTruthy();
    expect(view.queryByLabelText("Je confirme avoir effectué le contrôle proposé.")).toBeNull();
    fireEvent.click(view.getByRole("button", { name: "Continuer" }));
    choose(view, turns ? "Le moteur swing tourne" : "Le moteur swing ne tourne pas");
    choose(view, "Contacter le SAV");
    const trace = (view.getByLabelText("Contexte diagnostic prérempli") as HTMLTextAreaElement).value;
    expect(trace).toContain(turns
      ? "Liaison mécanique correctement emboîtée. Le moteur swing tourne visuellement mais le swing ne fonctionne pas correctement."
      : "Liaison mécanique correctement emboîtée. Aucun mouvement visible du moteur swing.");
    expect(trace).not.toMatch(/moteur swing HS/i);
    view.unmount();
  }
});

it("bruit : transmet chacune des cinq catégories sans contrôle ni photo technique", () => {
  for (const noise of IC22_NOISE_TYPES) {
    const view = page(); select(view); choose(view, "L’appareil fait un bruit anormal");
    expect(view.getByRole("heading", { name: "Quel type de bruit constatez-vous ?" })).toBeTruthy();
    choose(view, noise);
    expect(view.queryByLabelText("Je confirme avoir effectué le contrôle proposé.")).toBeNull();
    expect(view.queryByRole("link", { name: /Agrandir la photo annotée/ })).toBeNull();
    choose(view, "Contacter le SAV");
    const trace = (view.getByLabelText("Contexte diagnostic prérempli") as HTMLTextAreaElement).value;
    expect(trace).toContain(`Quel type de bruit constatez-vous ? — Réponse : ${noise}`);
    view.unmount();
  }
});

it("autre problème : conserve la description dans la demande et l’écarte après changement de branche", () => {
  const view = page(); select(view); choose(view, "Autre problème");
  const prompt = "Décrivez le problème rencontré avec votre appareil.";
  const description = "Symptôme fictif intermittent\nLe voyant change après quelques minutes.";
  const input = view.getByLabelText(prompt);
  input.focus();
  fireEvent.change(input, { target: { value: description } });
  expect(document.activeElement).toBe(input);
  expect(view.getByLabelText(prompt).getAttribute("maxlength")).toBe("2000");
  choose(view, "Contacter le SAV");
  expect((view.getByLabelText("Contexte diagnostic prérempli") as HTMLTextAreaElement).value)
    .toContain(`Description du problème : ${description}`);
  choose(view, "Revenir au diagnostic");
  expect(view.getByLabelText(prompt)).toHaveProperty("value", description);
  choose(view, "Étape précédente");
  choose(view, "L’appareil fait un bruit anormal"); choose(view, "Frottement"); choose(view, "Contacter le SAV");
  expect((view.getByLabelText("Contexte diagnostic prérempli") as HTMLTextAreaElement).value)
    .not.toContain(description);
});

// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CommercialDiagnosticPage from "./CommercialDiagnosticPage";
import { IC22_KM22_DISMANTLING_VIDEO_URL } from "../lib/commercialDiagnosticOverrides";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(Response.json({ models: ["IC 22"] }))));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderPage() {
  return render(<MemoryRouter><CommercialDiagnosticPage /></MemoryRouter>);
}

function selectIc22(view: ReturnType<typeof renderPage>) {
  fireEvent.change(view.getByLabelText("Rechercher un appareil"), { target: { value: "IC 22" } });
  fireEvent.click(view.getByRole("button", { name: "Lancer le diagnostic" }));
}

function clickSav(view: ReturnType<typeof renderPage>) {
  const buttons = view.getAllByRole("button", { name: "Contacter le SAV" });
  fireEvent.click(buttons[buttons.length - 1]);
}

it("masque les anciens modèles invalidés et clarifie le contrôle d'alimentation", async () => {
  const view = renderPage();
  await view.findByRole("heading", { name: /Rafraîchisseurs d'air/ });

  fireEvent.change(view.getByLabelText("Rechercher un appareil"), { target: { value: "Filtower" } });
  expect(view.getByText("Aucun appareil trouvé.")).toBeTruthy();

  selectIc22(view);
  fireEvent.click(view.getByRole("button", { name: "L'appareil ne s'allume pas" }));
  fireEvent.click(view.getByRole("button", { name: "Non" }));

  expect(view.getByText(/Si l'installation électrique du site est protégée par un disjoncteur/)).toBeTruthy();
  expect(view.queryByText(/Vérifiez la prise, le disjoncteur et le cable/i)).toBeNull();

  fireEvent.click(view.getByLabelText("Je confirme avoir effectué le contrôle proposé."));
  fireEvent.click(view.getByRole("button", { name: "Continuer" }));
  expect(view.getByRole("heading", { name: "Après ces vérifications, l'appareil s'allume-t-il ?" })).toBeTruthy();
});

it("regroupe les familles identiques et retire les anciens appareils du catalogue diagnostic", async () => {
  const view = renderPage();
  await view.findByRole("heading", { name: /Rafraîchisseurs d'air/ });

  fireEvent.change(view.getByLabelText("Rechercher un appareil"), { target: { value: "KM 22" } });
  expect(view.getByRole("heading", { name: "IC 22 / KM 22 / VL 220" })).toBeTruthy();
  expect(view.getAllByRole("button", { name: "Lancer le diagnostic" })).toHaveLength(1);

  fireEvent.change(view.getByLabelText("Rechercher un appareil"), { target: { value: "VL 120" } });
  expect(view.getByRole("heading", { name: "IC 12 / KM 12 / VL 120" })).toBeTruthy();
  expect(view.getAllByRole("button", { name: "Lancer le diagnostic" })).toHaveLength(1);

  fireEvent.change(view.getByLabelText("Rechercher un appareil"), { target: { value: "DUSTOMAT 4-10" } });
  expect(view.getByText("Aucun appareil trouvé.")).toBeTruthy();
  fireEvent.change(view.getByLabelText("Rechercher un appareil"), { target: { value: "DUSTOMAT 10" } });
  expect(view.getByText("Aucun appareil trouvé.")).toBeTruthy();

  fireEvent.change(view.getByLabelText("Rechercher un appareil"), { target: { value: "ECOCLIM" } });
  expect(view.getByText("Aucun appareil trouvé.")).toBeTruthy();

  fireEvent.change(view.getByLabelText("Rechercher un appareil"), { target: { value: "ePUR EX 1001" } });
  expect(view.getByRole("heading", { name: "ePUR EX 1000 / 1001" })).toBeTruthy();
  expect(view.getAllByRole("button", { name: "Lancer le diagnostic" })).toHaveLength(1);

  fireEvent.change(view.getByLabelText("Rechercher un appareil"), { target: { value: "ePUR EX 3001" } });
  expect(view.getByRole("heading", { name: "ePUR EX 3000 / 3001" })).toBeTruthy();
  expect(view.getAllByRole("button", { name: "Lancer le diagnostic" })).toHaveLength(1);

  fireEvent.change(view.getByLabelText("Rechercher un appareil"), { target: { value: "ePUR EX 5001" } });
  expect(view.getByRole("heading", { name: "ePUR EX 5000 / 5001" })).toBeTruthy();
  expect(view.getAllByRole("button", { name: "Lancer le diagnostic" })).toHaveLength(1);
});

it("laisse le formulaire SAV accessible immédiatement sans imposer le questionnaire", async () => {
  const view = renderPage();
  await view.findByRole("heading", { name: /Rafraîchisseurs d'air/ });
  selectIc22(view);

  expect(view.getByRole("heading", { name: "IC 22 / KM 22 / VL 220" })).toBeTruthy();
  expect(view.getByText(/formulaire SAV reste accessible à tout moment/)).toBeTruthy();
  fireEvent.click(view.getByRole("button", { name: "Contacter le SAV" }));
  expect(view.getByRole("form", { name: "Contacter le SAV" })).toBeTruthy();
  expect(view.getByLabelText("Société / client")).toBeTruthy();
  fireEvent.click(view.getByRole("button", { name: "Revenir au diagnostic" }));
  expect(view.queryByRole("form", { name: "Contacter le SAV" })).toBeNull();
  expect(view.getByRole("heading", { name: "Quel est le problème principal ?" })).toBeTruthy();
});

it("guide COOL clignotant vers niveau d'eau, capteur, vidéo puis formulaire SAV", async () => {
  const view = renderPage();
  await view.findByRole("heading", { name: /Rafraîchisseurs d'air/ });
  selectIc22(view);

  fireEvent.click(view.getByRole("button", { name: "L'appareil ne fait pas de froid" }));
  fireEvent.click(view.getByRole("button", { name: "Oui" }));
  fireEvent.click(view.getByRole("button", { name: "COOL clignote" }));

  expect(view.getByRole("heading", { name: "Le niveau d'eau dans la cuve est-il suffisant ?" })).toBeTruthy();
  expect(view.queryByText(/vidange/i)).toBeNull();

  fireEvent.click(view.getByRole("button", { name: "Oui" }));
  expect(view.getByRole("heading", { name: "Accéder au capteur de niveau d'eau" })).toBeTruthy();
  const video = view.getByRole("link", { name: "Voir la vidéo de démontage IC22 / KM22" });
  expect(video.getAttribute("href")).toBe(IC22_KM22_DISMANTLING_VIDEO_URL);

  fireEvent.click(view.getByLabelText("Je confirme avoir effectué le contrôle proposé."));
  fireEvent.click(view.getByRole("button", { name: "Continuer" }));
  expect(view.getByRole("heading", { name: /Le capteur de niveau d'eau est-il monté dans le bon sens/ })).toBeTruthy();

  fireEvent.click(view.getByRole("button", { name: "Oui" }));
  clickSav(view);
  expect(view.getByRole("form", { name: "Contacter le SAV" })).toBeTruthy();
  expect(view.getByLabelText("Société / client")).toBeTruthy();
  expect(view.getByLabelText("Nom du contact")).toBeTruthy();
  expect(view.getByLabelText("Téléphone")).toBeTruthy();
  expect(view.getByLabelText("E-mail")).toBeTruthy();
});

it("guide COOL fixe vers niveau d'eau, raccordements et observation sécurisée de la pompe", async () => {
  const view = renderPage();
  await view.findByRole("heading", { name: /Rafraîchisseurs d'air/ });
  selectIc22(view);

  fireEvent.click(view.getByRole("button", { name: "L'appareil ne fait pas de froid" }));
  fireEvent.click(view.getByRole("button", { name: "Oui" }));
  fireEvent.click(view.getByRole("button", { name: "COOL fixe" }));

  expect(view.getByRole("heading", { name: "Le réservoir contient-il suffisamment d'eau ?" })).toBeTruthy();
  expect(view.getByRole("button", { name: "Oui" })).toBeTruthy();
  expect(view.getByRole("button", { name: "Non" })).toBeTruthy();
  expect(view.queryByRole("button", { name: /Oui, mais très faiblement/i })).toBeNull();

  fireEvent.click(view.getByRole("button", { name: "Oui" }));
  expect(view.getByRole("heading", { name: "Contrôle du raccordement de la pompe" })).toBeTruthy();
  const video = view.getByRole("link", { name: "Voir la vidéo de démontage IC22 / KM22" });
  expect(video.getAttribute("href")).toBe(IC22_KM22_DISMANTLING_VIDEO_URL);
  expect(view.getByText(/connecteur électrique est correctement enfiché/)).toBeTruthy();
  expect(view.getByText(/tuyaux sont correctement raccordés/)).toBeTruthy();

  fireEvent.click(view.getByLabelText("Je confirme avoir effectué le contrôle proposé."));
  fireEvent.click(view.getByRole("button", { name: "Continuer" }));
  expect(view.getByRole("heading", { name: "Les raccordements électriques et hydrauliques de la pompe sont-ils corrects ?" })).toBeTruthy();

  fireEvent.click(view.getByRole("button", { name: "Oui" }));
  expect(view.getByRole("heading", { name: "Contrôle sous tension — sécuriser la zone" })).toBeTruthy();
  expect(view.getByText(/personne ne doit pouvoir accéder à l'intérieur de l'appareil/)).toBeTruthy();
  expect(view.getByText(/restez uniquement en observation/)).toBeTruthy();

  fireEvent.click(view.getByLabelText("Je confirme avoir effectué le contrôle proposé."));
  fireEvent.click(view.getByRole("button", { name: "Continuer" }));
  expect(view.getByRole("heading", { name: "La pompe fonctionne-t-elle lorsque l'appareil est en marche ?" })).toBeTruthy();

  fireEvent.click(view.getByRole("button", { name: "Non" }));
  expect(view.getByRole("heading", { name: "Pompe non fonctionnelle" })).toBeTruthy();
  expect(view.getAllByRole("button", { name: "Contacter le SAV" }).length).toBeGreaterThan(0);
});

it("n'affiche la vidéo de démontage qu'au moment d'ouvrir l'appareil", async () => {
  const view = renderPage();
  await view.findByRole("heading", { name: /Rafraîchisseurs d'air/ });
  selectIc22(view);

  fireEvent.click(view.getByRole("button", { name: "L'appareil ne fait pas de froid" }));
  fireEvent.click(view.getByRole("button", { name: "Oui" }));
  fireEvent.click(view.getByRole("button", { name: "COOL fixe" }));
  fireEvent.click(view.getByRole("button", { name: "Oui" }));
  expect(view.getByRole("link", { name: "Voir la vidéo de démontage IC22 / KM22" })).toBeTruthy();

  fireEvent.click(view.getByLabelText("Je confirme avoir effectué le contrôle proposé."));
  fireEvent.click(view.getByRole("button", { name: "Continuer" }));
  fireEvent.click(view.getByRole("button", { name: "Non" }));
  expect(view.getByRole("heading", { name: "Remettre les raccordements en place" })).toBeTruthy();
  expect(view.queryByRole("link", { name: "Voir la vidéo de démontage IC22 / KM22" })).toBeNull();

  fireEvent.click(view.getByRole("button", { name: "Étape précédente" }));
  fireEvent.click(view.getByRole("button", { name: "Étape précédente" }));
  fireEvent.click(view.getByRole("button", { name: "Étape précédente" }));
  fireEvent.click(view.getByRole("button", { name: "Étape précédente" }));
  fireEvent.click(view.getByRole("button", { name: "COOL clignote" }));
  fireEvent.click(view.getByRole("button", { name: "Oui" }));
  expect(view.getByRole("link", { name: "Voir la vidéo de démontage IC22 / KM22" })).toBeTruthy();
  fireEvent.click(view.getByLabelText("Je confirme avoir effectué le contrôle proposé."));
  fireEvent.click(view.getByRole("button", { name: "Continuer" }));
  fireEvent.click(view.getByRole("button", { name: "Non / il est à l'envers" }));
  expect(view.getByRole("heading", { name: "Repositionner le capteur" })).toBeTruthy();
  expect(view.queryByRole("link", { name: "Voir la vidéo de démontage IC22 / KM22" })).toBeNull();
});

it("termine par un conseil SAV panneaux ou environnement quand la pompe fonctionne, y compris sur un autre rafraîchisseur", async () => {
  const view = renderPage();
  await view.findByRole("heading", { name: /Rafraîchisseurs d'air/ });
  fireEvent.change(view.getByLabelText("Rechercher un appareil"), { target: { value: "IC 12" } });
  fireEvent.click(view.getByRole("button", { name: "Lancer le diagnostic" }));

  fireEvent.click(view.getByRole("button", { name: "L'appareil ne fait pas de froid" }));
  fireEvent.click(view.getByRole("button", { name: "Oui" }));
  fireEvent.click(view.getByRole("button", { name: "COOL fixe" }));
  fireEvent.click(view.getByRole("button", { name: "Oui" }));

  fireEvent.click(view.getByLabelText("Je confirme avoir effectué le contrôle proposé."));
  fireEvent.click(view.getByRole("button", { name: "Continuer" }));
  fireEvent.click(view.getByRole("button", { name: "Oui" }));
  fireEvent.click(view.getByLabelText("Je confirme avoir effectué le contrôle proposé."));
  fireEvent.click(view.getByRole("button", { name: "Continuer" }));
  fireEvent.click(view.getByRole("button", { name: "Oui" }));

  expect(view.getByRole("heading", { name: "Pompe en fonctionnement" })).toBeTruthy();
  expect(view.getAllByText(/circuit d'eau a déjà été contrôlé/i).length).toBeGreaterThan(0);
  expect(view.getAllByText(/panneaux évaporatifs/).length).toBeGreaterThan(0);
  expect(view.getAllByText(/conditions d'utilisation et de l'environnement/).length).toBeGreaterThan(0);
  expect(view.getByText(/Contactez le SAV pour conseil sur les panneaux évaporatifs/)).toBeTruthy();
  expect(view.getAllByRole("button", { name: "Contacter le SAV" }).length).toBeGreaterThan(0);
});

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

it("masque les anciens modèles invalidés et clarifie le contrôle d'alimentation", async () => {
  const view = renderPage();
  await view.findByText("Rafraîchisseurs d'air");

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

it("guide COOL clignotant vers niveau d'eau, capteur, vidéo puis formulaire SAV", async () => {
  const view = renderPage();
  await view.findByText("Rafraîchisseurs d'air");
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
  fireEvent.click(view.getByRole("button", { name: "Contacter le SAV" }));
  expect(view.getByRole("form", { name: "Contacter le SAV" })).toBeTruthy();
  expect(view.getByLabelText("Société / client")).toBeTruthy();
  expect(view.getByLabelText("Nom du contact")).toBeTruthy();
  expect(view.getByLabelText("Téléphone")).toBeTruthy();
  expect(view.getByLabelText("E-mail")).toBeTruthy();
});

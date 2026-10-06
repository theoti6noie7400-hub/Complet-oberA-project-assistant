// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("../dashboard/SavDashboard", () => ({ default: () => <div>Dashboard SAV de test</div> }));

import AssistantOberaPage from "./AssistantOberaPage";

function renderSavRoute() {
  return render(<MemoryRouter initialEntries={["/sav-maintenance"]}>
    <Routes>
      <Route path="/sav-maintenance" element={<AssistantOberaPage forceAdmin />} />
      <Route path="/" element={<h1>Accueil du Portail OberA</h1>} />
    </Routes>
  </MemoryRouter>);
}

afterEach(cleanup);

it("le logo OberA du SAV revient à la route du portail", () => {
  const view = renderSavRoute();
  fireEvent.click(view.container.querySelector("#logo-btn")!);
  expect(view.getByRole("heading", { name: "Accueil du Portail OberA" })).toBeTruthy();
});

it("le bouton de retour du dashboard rejoint le portail", () => {
  const view = renderSavRoute();
  fireEvent.click(view.container.querySelector("#main-header button:not(#logo-btn)")!);
  fireEvent.click(view.container.querySelector("#back-to-category-dashboard")!);
  expect(view.getByRole("heading", { name: "Accueil du Portail OberA" })).toBeTruthy();
});

it("partage le graphe IC22, confirme une vraie action et transmet la demande de pompe", () => {
  const view = renderSavRoute();
  fireEvent.click(view.container.querySelector('[data-category="rafraichisseurs"]')!);
  fireEvent.click(view.getByRole("button", { name: "IC 22" }));
  fireEvent.change(view.container.querySelector("#serial-number-input")!, { target: { value: "DEMO-SN-TEST" } });
  fireEvent.click(view.container.querySelector("#start-diagnostic-btn")!);
  const diagnostic = view.container.querySelector("#step-diagnostic")!;
  const choose = (label: string) => {
    fireEvent.click(Array.from(diagnostic.querySelectorAll("label")).find(item => item.textContent === label)!.querySelector("input")!);
    fireEvent.click(diagnostic.querySelector("#diagnostic-next")!);
  };
  choose("L’appareil ne fait pas de froid"); choose("Oui"); choose("Oui"); choose("Il reste fixe");
  expect(diagnostic.textContent).toContain("Vérifier le circuit d’eau visible");
  const next = diagnostic.querySelector("#diagnostic-next") as HTMLButtonElement;
  expect(next.disabled).toBe(true);
  fireEvent.click(Array.from(diagnostic.querySelectorAll("label")).find(item =>
    item.textContent?.includes("Je confirme avoir effectué le contrôle proposé"))!.querySelector("input")!);
  expect(next.disabled).toBe(false);
  fireEvent.click(next);
  choose("Tuyaux et connecteur visiblement raccordés, aucune anomalie simple");
  expect(diagnostic.textContent).toContain("Contrôle visuel de la pompe sous tension");
  expect(diagnostic.textContent).not.toContain("Je confirme avoir effectué le contrôle proposé");
  fireEvent.click(next);
  choose("Oui, continuer"); choose("La pompe ne fonctionne pas");
  expect(diagnostic.textContent).toContain("Pompe à remplacer");
  expect(next.textContent).toContain("Demander une pompe de remplacement");
  fireEvent.click(next);
  const message = view.container.querySelector("#contact-message") as HTMLTextAreaElement;
  expect(message.value).toContain("Demande explicite : pompe de remplacement");
  expect(message.value).toContain("DEMO-SN-TEST");
});

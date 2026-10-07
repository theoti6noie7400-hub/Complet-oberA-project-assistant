// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("../dashboard/SavDashboard", () => ({ default: () => <div>Dashboard SAV de test</div> }));

import AssistantOberaPage from "./AssistantOberaPage";
import { within } from "@testing-library/react";
import { IC22_NOISE_TYPES } from "../lib/ic22Diagnostic";

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

function staffDiagnostic() {
  const view = renderSavRoute();
  fireEvent.click(view.container.querySelector('[data-category="rafraichisseurs"]')!);
  fireEvent.click(view.getByRole("button", { name: "IC 22" }));
  fireEvent.change(view.container.querySelector("#serial-number-input")!, { target: { value: "DEMO-SWING" } });
  fireEvent.click(view.container.querySelector("#start-diagnostic-btn")!);
  const diagnostic = view.container.querySelector("#step-diagnostic") as HTMLElement;
  const next = () => fireEvent.click(diagnostic.querySelector("#diagnostic-next")!);
  const choose = (label: string) => { fireEvent.click(within(diagnostic).getByLabelText(label)); next(); };
  const control = () => { fireEvent.click(within(diagnostic).getByLabelText("Je confirme avoir effectué le contrôle proposé.")); next(); };
  return { view, diagnostic, next, choose, control };
}

it("STAFF : conserve le parcours Swing, la photo agrandissable et les deux traces moteur", () => {
  for (const turns of [true, false]) {
    const { view, diagnostic, next, choose, control } = staffDiagnostic();
    choose("L’oscillation ne fonctionne pas");
    expect(within(diagnostic).getByRole("link", { name: /Agrandir la photo annotée/ })).toBeTruthy();
    control(); choose("La tige est déboîtée mais peut être remise en place");
    expect(diagnostic.querySelector("#diagnostic-next")).toHaveProperty("disabled", true);
    control(); choose("Non");
    expect(diagnostic.textContent).toContain("Contrôle visuel du moteur swing sous tension");
    expect(within(diagnostic).queryByLabelText("Je confirme avoir effectué le contrôle proposé.")).toBeNull();
    next(); choose(turns ? "Le moteur swing tourne" : "Le moteur swing ne tourne pas"); next();
    const trace = (view.container.querySelector("#contact-message") as HTMLTextAreaElement).value;
    expect(trace).toContain("La tige est déboîtée mais peut être remise en place");
    expect(trace).toContain(turns
      ? "Liaison mécanique correctement emboîtée. Le moteur swing tourne visuellement mais le swing ne fonctionne pas correctement."
      : "Liaison mécanique correctement emboîtée. Aucun mouvement visible du moteur swing.");
    expect(trace).not.toMatch(/moteur swing HS/i);
    expect(view.container.querySelector("#main-header")).toBeTruthy();
    view.unmount();
  }
});

it("STAFF : chaque catégorie de bruit est reprise dans le formulaire SAV", () => {
  for (const label of IC22_NOISE_TYPES) {
    const { view, diagnostic, next, choose } = staffDiagnostic();
    choose("L’appareil fait un bruit anormal"); choose(label);
    expect(within(diagnostic).queryByRole("link", { name: /Agrandir la photo annotée/ })).toBeNull();
    next();
    expect((view.container.querySelector("#contact-message") as HTMLTextAreaElement).value)
      .toContain(`Quel type de bruit constatez-vous ? — Réponse : ${label}`);
    view.unmount();
  }
});

it("STAFF : une liaison cassée va au SAV et une remise en place réussie termine le diagnostic", () => {
  for (const broken of [true, false]) {
    const { view, diagnostic, next, choose, control } = staffDiagnostic();
    choose("L’oscillation ne fonctionne pas"); control();
    choose(broken ? "La liaison est cassée ou endommagée" : "La tige est déboîtée mais peut être remise en place");
    if (!broken) { control(); choose("Oui"); }
    expect(diagnostic.textContent).toContain(broken ? "Liaison mécanique du swing cassée ou endommagée." : "Swing rétabli");
    next();
    if (broken) expect((view.container.querySelector("#contact-message") as HTMLTextAreaElement).value)
      .toContain("Liaison mécanique du swing cassée ou endommagée.");
    else expect(view.container.querySelector("#summary-title")?.textContent).toBe("Swing rétabli");
    view.unmount();
  }
});

it("STAFF : garde le texte libre après retour et transmet uniquement la branche suivie", () => {
  const { view, diagnostic, next, choose } = staffDiagnostic();
  const prompt = "Décrivez le problème rencontré avec votre appareil.";
  const description = "Description fictive\nObservation sans cause certaine.";
  choose("Autre problème");
  const input = within(diagnostic).getByLabelText(prompt);
  input.focus();
  fireEvent.change(input, { target: { value: description } });
  expect(document.activeElement).toBe(input);
  fireEvent.click(diagnostic.querySelector("#diagnostic-back")!); choose("Autre problème");
  expect(within(diagnostic).getByLabelText(prompt)).toHaveProperty("value", description);
  next();
  expect((view.container.querySelector("#contact-message") as HTMLTextAreaElement).value)
    .toContain(`Description du problème : ${description}`);
  fireEvent.click(view.container.querySelector("#change-device-summary")!);
  fireEvent.click(view.getByRole("button", { name: "IC 22" }));
  fireEvent.click(view.container.querySelector("#start-diagnostic-btn")!);
  choose("L’appareil fait un bruit anormal"); choose("Frottement"); next();
  expect((view.container.querySelector("#contact-message") as HTMLTextAreaElement).value).not.toContain(description);
});

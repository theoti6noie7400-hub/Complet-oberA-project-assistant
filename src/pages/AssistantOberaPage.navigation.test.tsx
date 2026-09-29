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

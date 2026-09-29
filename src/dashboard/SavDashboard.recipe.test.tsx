// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";

vi.mock("../lib/recipeConfig", () => ({ RECIPE_API_ENABLED: true }));
vi.mock("../data/savData", () => ({ savData: { tickets: [{
  id: "SAV-DEMO-FICTIF", createdAt: new Date().toISOString(), firstResponseAt: null,
  closedAt: null, status: "open", category: "rafraichisseurs", model: "Appareil de démonstration",
  serial: "SERIE-DEMO", clientId: "CL-DEMO", clientName: "Client de démonstration",
  site: "Site de démonstration", severity: "low", cause: "Cause de démonstration",
  resolutionChannel: "sav", reopened: false, feedback: null
}], contracts: [] } }));

import SavDashboard from "./SavDashboard";
import { savData } from "../data/savData";

let requests = 0;
beforeEach(() => {
  requests = 0;
  vi.stubGlobal("fetch", vi.fn(() => {
    requests++;
    return Promise.resolve(Response.json({ cases: [{
      id: "20000000-0000-4000-8000-000000000001", sav_reference: "SAV-API-FICTIF",
      serial_number: "SERIE-API", client_name: "Client API fictif", model: "Machine API fictive",
      status: "open", created_at: "2026-09-29T07:00:00Z"
    }] }));
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("garde les KPI de démonstration distincts de la liste API", async () => {
  const view = render(<SavDashboard onOpenManualSav={() => {}} enableRecipeCases />);
  expect(view.getByText("Demandes totales").parentElement?.textContent).toContain("1");
  expect(requests).toBe(0);
  fireEvent.click(view.getByRole("button", { name: "Dossiers SAV enregistrés" }));
  await waitFor(() => expect(view.getByRole("button", { name: "Ouvrir le dossier SAV-API-FICTIF" })).toBeTruthy());
  expect(view.queryByText("Demandes totales")).toBeNull();
  fireEvent.click(view.getByRole("button", { name: "Statistiques" }));
  expect(view.getByText("Demandes totales").parentElement?.textContent).toContain("1");
  expect(savData.tickets).toHaveLength(1);
  expect(requests).toBe(1);
});

it("ne propose pas l'onglet API dans l'espace client du prototype", () => {
  const view = render(<SavDashboard onOpenManualSav={() => {}} />);
  expect(view.queryByRole("button", { name: "Dossiers SAV enregistrés" })).toBeNull();
  expect(requests).toBe(0);
});

// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react";
import RecordedSavCases from "./RecordedSavCases";

const sample = (number: number) => ({
  id: `20000000-0000-4000-8000-${String(number).padStart(12, "0")}`,
  sav_reference: `SAV-FICTIF-${number}`, serial_number: `SERIE-FICTIVE-${number}`,
  client_name: `Client fictif ${number}`, client_number: `CL-FICTIF-${number}`,
  model: `Machine fictive ${number}`, site: `Site imaginaire ${number}`,
  problem: `Problème fictif ${number}`, cause: `Cause fictive ${number}`,
  sav_action: `Action fictive ${number}`, sav_type: "technique", status: "open",
  created_at: "2026-09-29T07:00:00.000Z", updated_at: "2026-09-29T07:00:00.000Z"
});

let records = [sample(1)];
let authorized = true;
let denied = false;
let networkFailure = false;
let missing = false;
let listCalls = 0;
let detailCalls = 0;

function apiFetch(url: string) {
  if (networkFailure) return Promise.reject(new TypeError("Réseau fictif indisponible"));
  if (url === "/api/recipe/session") {
    authorized = true;
    return Promise.resolve(Response.json({ mode: "fictional_recipe" }));
  }
  if (!authorized) return Promise.resolve(Response.json({}, { status: 401 }));
  if (denied) return Promise.resolve(Response.json({}, { status: 403 }));
  if (url === "/api/sav/cases") {
    listCalls++;
    return Promise.resolve(Response.json({ cases: records }));
  }
  if (url.startsWith("/api/sav/cases/")) {
    detailCalls++;
    const id = decodeURIComponent(url.slice("/api/sav/cases/".length));
    const record = missing ? undefined : records.find(item => item.id === id);
    return Promise.resolve(record ? Response.json(record) : Response.json({}, { status: 404 }));
  }
  throw new Error(`Unexpected request ${url}`);
}

beforeEach(() => {
  records = [sample(1)]; authorized = true; denied = false; networkFailure = false;
  missing = false; listCalls = 0; detailCalls = 0;
  vi.stubGlobal("fetch", vi.fn(apiFetch));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("dossiers SAV enregistrés, distincts des statistiques", () => {
  it("affiche une liste vide puis les dossiers après actualisation, sans générer de référence", async () => {
    records = [];
    const view = render(<RecordedSavCases />);
    await waitFor(() => expect(view.getByText("Aucun dossier SAV enregistré.")).toBeTruthy());
    records = [{ ...sample(1), sav_reference: "" }, sample(2)];
    fireEvent.click(view.getByText("Actualiser la liste"));
    await waitFor(() => expect(view.getByRole("button", { name: "Ouvrir le dossier Référence SAV non renseignée" })).toBeTruthy());
    expect(view.getByRole("button", { name: "Ouvrir le dossier SAV-FICTIF-2" })).toBeTruthy();
    expect(view.container.textContent).not.toContain(sample(1).id);
    expect(listCalls).toBe(2);
  });

  it("relit le détail par UUID sans l'afficher et retrouve la liste après actualisation", async () => {
    const view = render(<RecordedSavCases />);
    fireEvent.click(await view.findByRole("button", { name: "Ouvrir le dossier SAV-FICTIF-1" }));
    const dialog = await view.findByRole("dialog", { name: "Détail du dossier SAV" });
    await waitFor(() => expect(within(dialog).getByText("Cause fictive 1")).toBeTruthy());
    expect(within(dialog).getByText("Action fictive 1")).toBeTruthy();
    expect(within(dialog).getByText("SERIE-FICTIVE-1")).toBeTruthy();
    expect(dialog.textContent).not.toContain(sample(1).id);
    expect(detailCalls).toBe(1);
    view.unmount();
    const refreshed = render(<RecordedSavCases />);
    await refreshed.findByRole("button", { name: "Ouvrir le dossier SAV-FICTIF-1" });
    expect(listCalls).toBe(2);
  });

  it("permet une nouvelle session SAV autorisée et n'affiche pas les dossiers à une session refusée", async () => {
    authorized = false;
    const view = render(<RecordedSavCases />);
    await view.findByRole("alert");
    expect(view.queryByText("SAV-FICTIF-1")).toBeNull();
    fireEvent.click(view.getByText("Ouvrir la session fictive SAV"));
    await view.findByRole("button", { name: "Ouvrir le dossier SAV-FICTIF-1" });
    view.unmount();
    const secondSession = render(<RecordedSavCases />);
    await secondSession.findByRole("button", { name: "Ouvrir le dossier SAV-FICTIF-1" });
    denied = true;
    fireEvent.click(secondSession.getByText("Actualiser la liste"));
    await waitFor(() => expect(secondSession.getByRole("alert").textContent).toContain("Accès refusé"));
    expect(secondSession.queryByText("SAV-FICTIF-1")).toBeNull();
  });

  it("signale l'erreur réseau sans conserver une liste devenue inaccessible, puis reprend", async () => {
    const view = render(<RecordedSavCases />);
    await view.findByRole("button", { name: "Ouvrir le dossier SAV-FICTIF-1" });
    networkFailure = true;
    fireEvent.click(view.getByText("Actualiser la liste"));
    await waitFor(() => expect(view.getByRole("alert").textContent).toContain("Erreur réseau"));
    expect(view.queryByText("SAV-FICTIF-1")).toBeNull();
    networkFailure = false;
    fireEvent.click(view.getByText("Actualiser la liste"));
    await view.findByRole("button", { name: "Ouvrir le dossier SAV-FICTIF-1" });
  });

  it("signale un dossier supprimé sans afficher les anciennes données du détail", async () => {
    const view = render(<RecordedSavCases />);
    await view.findByRole("button", { name: "Ouvrir le dossier SAV-FICTIF-1" });
    missing = true;
    fireEvent.click(view.getByRole("button", { name: "Ouvrir le dossier SAV-FICTIF-1" }));
    const dialog = await view.findByRole("dialog");
    await waitFor(() => expect(within(dialog).getByRole("alert").textContent).toContain("introuvable"));
    expect(dialog.textContent).not.toContain("Cause fictive 1");
  });

  it("annonce la limite de 100 dossiers lorsqu'elle est atteinte", async () => {
    records = Array.from({ length: 100 }, (_, index) => sample(index + 1));
    const view = render(<RecordedSavCases />);
    await waitFor(() => expect(view.getByText(/Limite de 100 dossiers affichés/)).toBeTruthy());
    expect(view.getAllByRole("button", { name: /Ouvrir le dossier SAV-FICTIF-/ })).toHaveLength(100);
  });
});

// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { savData } from "../data/savData";

vi.mock("../dashboard/SavDashboard", () => ({
  default: ({ onOpenManualSav }: { onOpenManualSav: () => void }) =>
    <button onClick={onOpenManualSav}>Ouvrir la saisie manuelle</button>
}));
vi.mock("../data/savData", () => ({ savData: { tickets: [], contracts: [] } }));
vi.mock("../lib/recipeConfig", () => ({ RECIPE_API_ENABLED: true }));

const id = "20000000-0000-4000-8000-000000000002";
let session = false;
let errorStatus = 0;
let networkFailure = false;
let posts = 0;
let saved: Record<string, string> | null = null;

function mockFetch(url: string, init?: RequestInit) {
  if (url === "/api/session") return Promise.resolve(Response.json({}, { status: session ? 200 : 401 }));
  if (url === "/api/sav/cases" && init?.method === "POST") {
    posts++;
    if (networkFailure) return Promise.reject(new TypeError("Réseau fictif indisponible"));
    if (errorStatus) return Promise.resolve(Response.json({ error: "test" }, { status: errorStatus }));
    const body = JSON.parse(init.body as string);
    saved = {
      id, sav_reference: body.savReference, serial_number: body.serialNumber,
      client_name: body.clientName, client_number: body.clientNumber, model: body.model,
      site: body.site, problem: body.problem, cause: body.cause,
      sav_action: body.savAction, sav_type: body.savType
    };
    return Promise.resolve(Response.json(saved, { status: 201 }));
  }
  if (url === `/api/sav/cases/${id}` && saved) return Promise.resolve(Response.json(saved));
  return Promise.resolve(Response.json({ error: "unexpected" }, { status: 404 }));
}

async function form() {
  const { default: AssistantOberaPage } = await import("./AssistantOberaPage");
  const view = render(<MemoryRouter><AssistantOberaPage forceAdmin /></MemoryRouter>);
  fireEvent.click(view.container.querySelector("#main-header button:not(#logo-btn)")!);
  fireEvent.click(view.getByText("Ouvrir la saisie manuelle"));
  return view;
}

const input = (view: Awaited<ReturnType<typeof form>>, name: string, value: string) =>
  fireEvent.change(view.container.querySelector(`#${name}`)!, { target: { value } });

beforeEach(() => {
  window.sessionStorage.clear();
  savData.tickets.length = 0;
  session = false; errorStatus = 0; networkFailure = false; posts = 0; saved = null;
  vi.stubGlobal("fetch", vi.fn(mockFetch));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("formulaire manuel SAV en mode recette", () => {
  it("garde la simulation actuelle séparée, sans appel de création API", async () => {
    const view = await form();
    input(view, "manual-sav-probleme", "Problème fictif");
    input(view, "manual-sav-cause", "Cause fictive");
    input(view, "manual-sav-action", "Action fictive");
    fireEvent.submit(view.container.querySelector("#manual-sav-form")!);
    expect(view.getByText(/Intervention enregistrée \(simulation\)/)).toBeTruthy();
    expect(savData.tickets).toHaveLength(1);
    expect(posts).toBe(0);
  });

  it("sépare les champs, affiche la référence métier et restaure le dossier après actualisation", async () => {
    session = true;
    const view = await form();
    fireEvent.click(view.getByLabelText("Enregistrement partagé (API interne)"));
    await waitFor(() => expect(view.queryByText(/Session interne absente/)).toBeNull());
    input(view, "manual-sav-ref", " SAV-FICTIF-1 ");
    input(view, "manual-sav-serial", "SERIE-FICTIVE-1");
    input(view, "manual-sav-client", "Client fictif");
    input(view, "manual-sav-client-number", "CL-FICTIF-1");
    input(view, "manual-sav-appareil", "Appareil fictif");
    input(view, "manual-sav-site", "Site fictif");
    input(view, "manual-sav-probleme", "Panne fictive");
    input(view, "manual-sav-cause", "Cause fictive");
    input(view, "manual-sav-action", "Action fictive");
    fireEvent.change(view.container.querySelector("#manual-sav-type")!, { target: { value: "usure" } });
    fireEvent.submit(view.container.querySelector("#manual-sav-form")!);
    await waitFor(() => expect(view.getByRole("status").textContent).toContain(" SAV-FICTIF-1 "));
    expect(view.getByRole("status").textContent).not.toContain(id);
    expect(posts).toBe(1);
    expect(saved).toMatchObject({ sav_reference: " SAV-FICTIF-1 ", serial_number: "SERIE-FICTIVE-1",
      client_name: "Client fictif", client_number: "CL-FICTIF-1", sav_type: "usure",
      problem: "Panne fictive", cause: "Cause fictive", sav_action: "Action fictive" });
    view.unmount();
    const refreshed = await form();
    await waitFor(() => expect(refreshed.getByRole("status").textContent).toContain(" SAV-FICTIF-1 "));
    expect((refreshed.container.querySelector("#manual-sav-serial") as HTMLInputElement).value).toBe("SERIE-FICTIVE-1");
    expect(posts).toBe(1);
    refreshed.unmount();
    session = false;
    const reconnected = await form();
    fireEvent.click(reconnected.getByLabelText("Enregistrement partagé (API interne)"));
    await waitFor(() => expect(reconnected.getByText("Se reconnecter")).toBeTruthy());
    reconnected.unmount();
    session = true;
    const authorizedAgain = await form();
    fireEvent.click(authorizedAgain.getByLabelText("Enregistrement partagé (API interne)"));
    await waitFor(() => expect(authorizedAgain.getByRole("status").textContent).toContain(" SAV-FICTIF-1 "));
    expect(posts).toBe(1);
  });

  it("affiche une erreur serveur sans création en simulation", async () => {
    session = true;
    const view = await form();
    fireEvent.click(view.getByLabelText("Enregistrement partagé (API interne)"));
    await waitFor(() => expect(view.queryByText(/Session interne absente/)).toBeNull());
    errorStatus = 500;
    input(view, "manual-sav-appareil", "Appareil fictif");
    input(view, "manual-sav-site", "Site fictif");
    input(view, "manual-sav-probleme", "Panne fictive");
    input(view, "manual-sav-cause", "Cause fictive");
    input(view, "manual-sav-action", "Action fictive");
    fireEvent.submit(view.container.querySelector("#manual-sav-form")!);
    await waitFor(() => expect(view.getByRole("alert").textContent).toContain("500"));
    expect(view.getByRole("alert").textContent).toContain("Aucun enregistrement en simulation");
    expect(posts).toBe(1);
    expect(view.container.querySelector("#step-dashboard")?.textContent).not.toContain("SAV-2026");
  });

  it("garde le mode API après une erreur réseau et reprend sans double enregistrement", async () => {
    session = true;
    const view = await form();
    fireEvent.click(view.getByLabelText("Enregistrement partagé (API interne)"));
    await waitFor(() => expect(view.queryByText(/Session interne absente/)).toBeNull());
    input(view, "manual-sav-appareil", "Appareil fictif");
    input(view, "manual-sav-site", "Site fictif");
    input(view, "manual-sav-probleme", "Panne fictive");
    input(view, "manual-sav-cause", "Cause fictive");
    input(view, "manual-sav-action", "Action fictive");
    networkFailure = true;
    const formNode = view.container.querySelector("#manual-sav-form")!;
    fireEvent.submit(formNode);
    fireEvent.submit(formNode);
    await waitFor(() => expect(view.getByRole("alert").textContent).toContain("Réseau fictif indisponible"));
    expect(posts).toBe(1);
    expect(savData.tickets).toHaveLength(0);
    expect(view.getByLabelText("Enregistrement partagé (API interne)")).toHaveProperty("checked", true);
    networkFailure = false;
    fireEvent.submit(formNode);
    fireEvent.submit(formNode);
    await waitFor(() => expect(view.getByRole("status").textContent).toContain("Dossier enregistré"));
    expect(posts).toBe(2);
    expect(saved).not.toBeNull();
    expect(savData.tickets).toHaveLength(0);
  });
});

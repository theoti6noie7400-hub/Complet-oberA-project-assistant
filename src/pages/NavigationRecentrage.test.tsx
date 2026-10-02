// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../App";

const deviceId = "e1000000-0000-4000-8000-000000000001";
const requestId = "f1000000-0000-4000-8000-000000000001";
const clientId = "a1000000-0000-4000-8000-000000000001";
let role: string | null;
let calls: string[];

function renderAt(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
}

beforeEach(() => {
  role = null;
  calls = [];
  vi.stubGlobal("fetch", vi.fn((url: string) => {
    calls.push(url);
    if (url === "/api/session") return Promise.resolve(role
      ? Response.json({ role, organizationIds: role === "client" || role === "reseller" ? ["org-demo"] : [] })
      : Response.json({}, { status: 401 }));
    if (url === "/api/logout") { role = null; return Promise.resolve(new Response(null, { status: 204 })); }
    if (url === "/api/client/me") return Promise.resolve(Response.json({ organization: { name: "CLIENT DEMO" } }));
    if (url === "/api/client/devices") return Promise.resolve(Response.json({ devices: [{ id: deviceId, model: "IC 12", serial: "DEMO-SN-A" }] }));
    if (url === `/api/client/devices/${deviceId}`) return Promise.resolve(Response.json({ id: deviceId, model: "IC 12", serial: "DEMO-SN-A" }));
    if (url === "/api/client/requests") return Promise.resolve(Response.json({ requests: [] }));
    if (url === `/api/client/requests/${requestId}`) return Promise.resolve(Response.json({ id: requestId, request_type: "sav", device_id: deviceId,
      subject: "DEMO panne", message: "DEMO problème", public_status: "received", created_at: "2026-09-29T00:00:00Z" }));
    if (url === "/api/client/documents") return Promise.resolve(Response.json({ documents: [] }));
    if (url === "/api/sav/clients") return Promise.resolve(Response.json({ clients: [
      { id: clientId, name: "CLIENT DEMO ALPHA", device_count: 1, external_reference: null }] }));
    if (url === `/api/sav/clients/${clientId}/devices`) return Promise.resolve(Response.json({ organization: {
      id: clientId, name: "CLIENT DEMO ALPHA" }, devices: [
      { id: deviceId, model: "IC 22", serial: "DEMO-SN-A-001", notice_available: false }] }));
    if (url === `/api/sav/clients/${clientId}/devices/${deviceId}`)
      return Promise.resolve(Response.json({ organization: { id: clientId, name: "CLIENT DEMO ALPHA" },
        device: { id: deviceId, model: "IC 22", serial: "DEMO-SN-A-001", notice_available: false } }));
    throw new Error(`Unexpected request ${url}`);
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("présente uniquement le SAV interne à l'accueil", async () => {
  const view = renderAt("/");
  await view.findByRole("heading", { name: "SAV / Maintenance" });
  const targets = Array.from(view.container.querySelectorAll("a.portal-card-cta"), link => link.getAttribute("href"));
  expect(targets).toEqual(["/sav-maintenance"]);
  expect(view.getByText("Outil interne SAV OberA")).toBeTruthy();
  expect(view.queryByText("Espace Client")).toBeNull();
  expect(view.queryByText("Marketing")).toBeNull();
  expect(view.queryByText("Espace Revendeur")).toBeNull();
});

it("garde les espaces SAV et calculateur pour le SAV interne", async () => {
  role = "sav_manager";
  const home = renderAt("/");
  await home.findByRole("heading", { name: "SAV / Maintenance" });
  expect(home.container.querySelectorAll("a.portal-card-cta")).toHaveLength(3);
  home.unmount();
  const sav = renderAt("/sav-maintenance");
  await sav.findByText("Que souhaitez-vous faire ?");
  expect(sav.getByRole("link", { name: "Clients et parc appareils" })).toBeTruthy();
  expect(sav.queryByText("Commander des consommables (Filtres, etc.)")).toBeNull();
  sav.unmount();
  const calculator = renderAt("/charbon-actif");
  await calculator.findByRole("heading", { name: "Calculateur de saturation du charbon actif" });
});

it("autorise le Commercial à consulter le parc puis le diagnostic Client du bon appareil, sans SAV ni API externe", async () => {
  role = "commercial";
  const home = renderAt("/");
  await home.findByRole("heading", { name: "Parc clients" });
  expect(home.getByRole("heading", { name: "Tester l’espace Client" })).toBeTruthy();
  expect(home.queryByRole("heading", { name: "SAV / Maintenance" })).toBeNull();
  home.unmount();
  const park = renderAt("/sav-maintenance/client-preview");
  await park.findByRole("button", { name: /CLIENT DEMO ALPHA/ });
  fireEvent.click(park.getByRole("button", { name: /CLIENT DEMO ALPHA/ }));
  const previewLink = await park.findByRole("link", { name: "Tester l’espace Client" });
  expect(previewLink.getAttribute("href")).toBe(`/sav-maintenance/clients/${clientId}/devices/${deviceId}`);
  park.unmount();
  const preview = renderAt(`/sav-maintenance/clients/${clientId}/devices/${deviceId}`);
  await preview.findByRole("heading", { name: "Diagnostic : IC 22" });
  expect(preview.getByText("APERÇU CLIENT — USAGE INTERNE OBERA")).toBeTruthy();
  expect(preview.getAllByText(/DEMO-SN-A-001/)).toHaveLength(2);
  expect(calls.some(url => url.startsWith("/api/client/") || url === "/api/sav/cases")).toBe(false);
  preview.unmount();
  const blocked = renderAt("/sav-maintenance");
  await blocked.findByRole("heading", { name: "Accès refusé" });
});

it.each(["marketing", "commercial", "adv", "logistique"])("résout /service/%s avec une page indisponible", async key => {
  role = "global_admin";
  const view = renderAt(`/service/${key}`);
  await view.findByText("Cet espace n'est plus disponible dans le portail SAV / service client.");
  expect(view.getByRole("link", { name: "Retour au portail" })).toBeTruthy();
  expect(view.queryByText("Bientot disponible")).toBeNull();
});

it.each(["/reseller-space", `/reseller-space/requests/${requestId}`])("résout %s sans connexion Revendeur", async path => {
  role = "reseller";
  const view = renderAt(path);
  await view.findByRole("heading", { name: "Espace Revendeur indisponible" });
  expect(view.queryByLabelText("Code PIN")).toBeNull();
  expect(calls.filter(url => url.startsWith("/api/reseller/"))).toEqual([]);
  fireEvent.click(view.getByRole("button", { name: "Déconnexion" }));
  await waitFor(() => expect(calls).toContain("/api/logout"));
  await view.findByRole("heading", { name: "SAV / Maintenance" });
});

it.each(["/client-space", `/client-space/devices/${deviceId}`,
  `/client-space/diagnostic/${deviceId}`, `/client-space/requests/${requestId}`])
  ("résout %s sans exposer l'espace Client", async path => {
  role = "client";
  const view = renderAt(path);
  await view.findByRole("heading", { name: "Espace Client indisponible en V1" });
  expect(view.queryByLabelText("Code PIN")).toBeNull();
  expect(calls.some(url => url.startsWith("/api/client/"))).toBe(false);
});

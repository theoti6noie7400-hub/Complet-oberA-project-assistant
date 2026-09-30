// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../App";

const deviceId = "e1000000-0000-4000-8000-000000000001";
const requestId = "f1000000-0000-4000-8000-000000000001";
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
    throw new Error(`Unexpected request ${url}`);
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("affiche uniquement les liens SAV et Client à l'accueil", async () => {
  const view = renderAt("/");
  await view.findByRole("heading", { name: "SAV / Maintenance" });
  const targets = Array.from(view.container.querySelectorAll("a.portal-card-cta"), link => link.getAttribute("href"));
  expect(targets).toEqual(["/sav-maintenance", "/client-space"]);
  expect(view.queryByText("Marketing")).toBeNull();
  expect(view.queryByText("Espace Revendeur")).toBeNull();
});

it("garde les espaces SAV et calculateur pour le SAV interne", async () => {
  role = "sav_manager";
  const home = renderAt("/");
  await home.findByRole("heading", { name: "SAV / Maintenance" });
  expect(home.container.querySelectorAll("a.portal-card-cta")).toHaveLength(1);
  home.unmount();
  const sav = renderAt("/sav-maintenance");
  await sav.findByText("Que souhaitez-vous faire ?");
  sav.unmount();
  const calculator = renderAt("/charbon-actif");
  await calculator.findByRole("heading", { name: "Calculateur de saturation du charbon actif" });
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
  await view.findByRole("heading", { name: "Espace Client" });
});

it.each([
  [`/client-space/devices/${deviceId}`, "Numéro de série : DEMO-SN-A"],
  [`/client-space/diagnostic/${deviceId}`, "Diagnostic : IC 12"],
  [`/client-space/requests/${requestId}`, "DEMO problème"]
])("conserve l'URL Client profonde %s", async (path, expected) => {
  role = "client";
  const view = renderAt(path);
  await view.findByText(expected);
  expect(calls.some(url => url.startsWith("/api/reseller/"))).toBe(false);
});

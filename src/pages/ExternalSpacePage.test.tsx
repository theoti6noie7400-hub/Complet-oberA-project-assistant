// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminAuthProvider } from "../auth/adminAuth";
import ExternalSpacePage from "./ExternalSpacePage";

const deviceId = "e1000000-0000-4000-8000-000000000001";
const requestId = "f1000000-0000-4000-8000-000000000001";
const result = (body: object, status = 200) => Promise.resolve(Response.json(body, { status }));

function appAt(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><AdminAuthProvider><Routes>
    <Route path="/" element={<div>Portail</div>} />
    <Route path="/client-space" element={<ExternalSpacePage role="client" />} />
    <Route path="/client-space/devices/:id" element={<ExternalSpacePage role="client" view="device" />} />
    <Route path="/client-space/diagnostic/:id" element={<ExternalSpacePage role="client" view="diagnostic" />} />
    <Route path="/client-space/requests/:id" element={<ExternalSpacePage role="client" view="request" />} />
    <Route path="/reseller-space" element={<ExternalSpacePage role="reseller" />} />
    <Route path="/reseller-space/requests/:id" element={<ExternalSpacePage role="reseller" view="request" />} />
  </Routes></AdminAuthProvider></MemoryRouter>);
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("connecte Client, montre son appareil, le diagnostic et enregistre puis relit sa demande", async () => {
  let active: "client" | null = null;
  let created = false;
  const calls: string[] = [];
  const item = { id: requestId, request_type: "sav", device_id: deviceId, subject: "DEMO panne",
    message: "DEMO problème", public_status: "received", created_at: "2026-09-29T00:00:00Z" };
  vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => {
    calls.push(url);
    if (url === "/api/session") return active ? result({ role: active, organizationIds: ["org-demo-a"] }) : result({}, 401);
    if (url === "/api/client/login") { active = "client"; return result({ role: "client" }); }
    if (url === "/api/logout") { active = null; return Promise.resolve(new Response(null, { status: 204 })); }
    if (url === "/api/client/me") return result({ organization: { name: "CLIENT DEMO ALPHA" }, role: "client" });
    if (url === "/api/client/devices") return result({ devices: [{ id: deviceId, model: "IC 12", serial: "DEMO-SN-A" }] });
    if (url === `/api/client/devices/${deviceId}`) return result({ id: deviceId, model: "IC 12", serial: "DEMO-SN-A" });
    if (url === "/api/client/documents") return result({ documents: [{ id: "doc-a", title: "DOCUMENT DEMO" }] });
    if (url === "/api/client/requests" && init?.method === "POST") {
      const body = JSON.parse(init.body as string);
      expect(body.deviceId).toBe(deviceId);
      expect(body.requestType).toBe("sav");
      created = true; return result(item, 201);
    }
    if (url === "/api/client/requests") return result({ requests: created ? [item] : [] });
    if (url === `/api/client/requests/${requestId}`) return result(item);
    throw new Error(`Unexpected ${url}`);
  }));
  const view = appAt("/client-space");
  await view.findByText("Connexion espace client");
  fireEvent.change(view.getByLabelText("Identifiant"), { target: { value: "DEMO-CLIENT-A" } });
  fireEvent.change(view.getByLabelText("Code PIN"), { target: { value: "9876" } });
  fireEvent.click(view.getByRole("button", { name: "Se connecter" }));
  await view.findByText("Bienvenue, CLIENT DEMO ALPHA");
  fireEvent.click(view.getByRole("link", { name: /IC 12 — DEMO-SN-A/ }));
  await view.findByText("Numéro de série : DEMO-SN-A");
  fireEvent.click(view.getByRole("link", { name: "Démarrer le diagnostic" }));
  await view.findByText("Diagnostic : IC 12");
  await view.findByText("Quel est le problème principal ?");
  fireEvent.click(view.getByRole("button", { name: "L'appareil ne fait pas de froid" }));
  await view.findByText("Le ventilateur tourne mais l'air reste chaud ?");
  fireEvent.click(view.getByRole("link", { name: "Retour à mon espace" }));
  await view.findByText("Nouvelle demande");
  fireEvent.change(view.getByLabelText("Appareil concerné"), { target: { value: deviceId } });
  fireEvent.change(view.getByLabelText("Objet"), { target: { value: "DEMO panne" } });
  fireEvent.change(view.getByLabelText("Votre message"), { target: { value: "DEMO problème" } });
  fireEvent.click(view.getByRole("button", { name: "Envoyer la demande" }));
  await view.findByText(/Demande enregistrée/);
  fireEvent.click(view.getByRole("link", { name: "Voir le détail" }));
  await view.findByText("DEMO problème");
  expect(calls).not.toContain("/api/sav/cases");
  expect(view.queryByText("CAUSE INTERNE")).toBeNull();
});

it("connecte Revendeur sans accès appareil et présente ses demandes et documents", async () => {
  let active = false;
  vi.stubGlobal("fetch", vi.fn((url: string) => {
    if (url === "/api/session") return active ? result({ role: "reseller", organizationIds: ["org-demo-r"] }) : result({}, 401);
    if (url === "/api/reseller/login") { active = true; return result({ role: "reseller" }); }
    if (url === "/api/reseller/me") return result({ organization: { name: "REVENDEUR DEMO ALPHA" } });
    if (url === "/api/reseller/requests") return result({ requests: [] });
    if (url === "/api/reseller/documents") return result({ documents: [{ id: "doc-r", title: "DOCUMENT REVENDEUR DEMO" }] });
    throw new Error(`Unexpected ${url}`);
  }));
  const view = appAt("/reseller-space");
  await view.findByText("Connexion espace revendeur");
  fireEvent.change(view.getByLabelText("Identifiant"), { target: { value: "DEMO-RESELLER-A" } });
  fireEvent.change(view.getByLabelText("Code PIN"), { target: { value: "9876" } });
  fireEvent.click(view.getByRole("button", { name: "Se connecter" }));
  await waitFor(() => expect(view.getByText("Bienvenue, REVENDEUR DEMO ALPHA")).toBeTruthy());
  expect(view.queryByText("Mes appareils")).toBeNull();
  expect(view.getByText("DOCUMENT REVENDEUR DEMO")).toBeTruthy();
});

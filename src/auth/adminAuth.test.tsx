// @vitest-environment jsdom
import React, { useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminAuthProvider } from "./adminAuth";
import RequireAdmin from "../components/RequireAdmin";
import AdminSessionBar from "../components/AdminSessionBar";
import AdminLoginPage from "../pages/AdminLoginPage";
import AssistantOberaPage from "../pages/AssistantOberaPage";
import ResellerSpacePage from "../pages/ResellerSpacePage";
import ServiceHubPage from "../pages/ServiceHubPage";

let role: string | null = null;
let logoutCalls = 0;
const accepted = new Map([["DEMO-ADMIN", "global_admin"], ["DEMO-MARKETING", "marketing"]]);

function fetchApi(url: string, init?: RequestInit) {
  if (url === "/api/session") return Promise.resolve(role
    ? Response.json({ role }) : Response.json({ error: "authentication_required" }, { status: 401 }));
  if (url === "/api/login") {
    const body = JSON.parse(init?.body as string);
    if (body.pin !== "5678" || !accepted.has(body.identifier))
      return Promise.resolve(Response.json({ error: "invalid_credentials" }, { status: 401 }));
    role = accepted.get(body.identifier)!;
    return Promise.resolve(Response.json({ role: "global_admin" }));
  }
  if (url === "/api/logout") {
    role = null;
    logoutCalls++;
    return Promise.resolve(new Response(null, { status: 204 }));
  }
  throw new Error(`Unexpected request ${url}`);
}

function ProtectedSav() {
  const [step, setStep] = useState(0);
  return <><div>SAV autorisé</div><button onClick={() => setStep(value => value + 1)}>Étape {step}</button></>;
}

function appAt(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><AdminAuthProvider>
    <AdminSessionBar />
    <Routes>
      <Route path="/admin-login" element={<AdminLoginPage />} />
      <Route path="/sav-maintenance" element={<RequireAdmin><ProtectedSav /></RequireAdmin>} />
      <Route path="/service/marketing" element={<RequireAdmin><ServiceHubPage /></RequireAdmin>} />
      <Route path="/" element={<div>Portail</div>} />
      <Route path="/client-space" element={<AssistantOberaPage />} />
      <Route path="/reseller-space" element={<ResellerSpacePage />} />
      <Route path="/reseller-space/requests/:id" element={<ResellerSpacePage />} />
    </Routes>
  </AdminAuthProvider></MemoryRouter>);
}

beforeEach(() => {
  role = null;
  logoutCalls = 0;
  window.sessionStorage.clear();
  vi.stubGlobal("fetch", vi.fn(fetchApi));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("refuse l'URL SAV directe sans session, y compris après falsification de sessionStorage", async () => {
  window.sessionStorage.setItem("obera_admin_auth", JSON.stringify({ role: "global_admin", isAuthenticated: true }));
  const view = appAt("/sav-maintenance");
  await waitFor(() => expect(view.getByText("Connexion interne")).toBeTruthy());
  expect(view.queryByText("SAV autorisé")).toBeNull();
  expect(window.sessionStorage.getItem("obera_admin_auth")).toBeNull();
});

it("vérifie le PIN par API et montre l'indisponibilité de l'ancien espace Marketing", async () => {
  const view = appAt("/admin-login?next=%2Fsav-maintenance");
  await waitFor(() => expect(view.getByText("Connexion interne")).toBeTruthy());
  fireEvent.change(view.getByPlaceholderText("Votre identifiant"), { target: { value: "DEMO-MARKETING" } });
  fireEvent.change(view.getByLabelText("Code PIN"), { target: { value: "0000" } });
  fireEvent.click(view.getByRole("button", { name: "Acceder" }));
  await waitFor(() => expect(view.getByText(/Connexion refusée/)).toBeTruthy());
  fireEvent.change(view.getByLabelText("Code PIN"), { target: { value: "5678" } });
  fireEvent.click(view.getByRole("button", { name: "Acceder" }));
  await waitFor(() => expect(view.getByText("Cet espace n'est plus disponible dans le portail SAV / service client.")).toBeTruthy());
  expect(view.queryByText("SAV autorisé")).toBeNull();
});

it("ne croit pas un rôle dans la réponse login et révoque la session lors de la déconnexion", async () => {
  const view = appAt("/admin-login");
  await waitFor(() => expect(view.getByText("Connexion interne")).toBeTruthy());
  fireEvent.change(view.getByPlaceholderText("Votre identifiant"), { target: { value: "DEMO-ADMIN" } });
  fireEvent.change(view.getByLabelText("Code PIN"), { target: { value: "5678" } });
  fireEvent.click(view.getByRole("button", { name: "Acceder" }));
  await waitFor(() => expect(view.getByText("SAV autorisé")).toBeTruthy());
  fireEvent.click(view.getByRole("button", { name: "Déconnexion" }));
  await waitFor(() => expect(view.getByText("Connexion interne")).toBeTruthy());
  expect(logoutCalls).toBe(1);
  expect(role).toBeNull();
});

it("préserve l'écran protégé et son état lors d'un changement de focus", async () => {
  role = "global_admin";
  const view = appAt("/sav-maintenance");
  const button = await view.findByRole("button", { name: "Étape 0" });
  fireEvent.click(button);
  expect(view.getByRole("button", { name: "Étape 1" })).toBeTruthy();
  window.dispatchEvent(new Event("focus"));
  await waitFor(() => expect(view.getByRole("button", { name: "Étape 1" })).toBeTruthy());
});

it("préserve la connexion Client et affiche l'indisponibilité Revendeur, y compris sur une URL profonde", async () => {
  const client = appAt("/client-space");
  expect(await client.findByText("Connexion espace client")).toBeTruthy();
  expect((client.getByLabelText("Identifiant") as HTMLInputElement).value).toBe("");
  expect((client.getByLabelText("Code PIN") as HTMLInputElement).value).toBe("");
  client.unmount();
  const reseller = appAt("/reseller-space/requests/fictional-id");
  expect(await reseller.findByRole("heading", { name: "Espace Revendeur indisponible" })).toBeTruthy();
  expect(reseller.queryByLabelText("Code PIN")).toBeNull();
});

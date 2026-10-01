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

afterEach(() => { cleanup(); sessionStorage.clear(); vi.unstubAllGlobals(); });

it("montre la photo officielle exacte dans chaque fiche appareil Client", async () => {
  const models = [
    { id: deviceId, model: "IC 22", serial: "DEMO-SN-A-001", image: "ic-22.png" },
    { id: "e1000000-0000-4000-8000-000000000002", model: "DUSTOMAT 4-24",
      serial: "DEMO-SN-A-002", image: "dustomat-4-24.png" }
  ];
  vi.stubGlobal("fetch", vi.fn((url: string) => {
    if (url === "/api/session") return result({ role: "client", organizationIds: ["org-demo-a"] });
    if (url === "/api/client/me") return result({ organization: { name: "CLIENT DEMO ALPHA" } });
    if (url === "/api/client/devices") return result({ devices: models });
    if (url === "/api/client/requests") return result({ requests: [] });
    if (url === "/api/client/documents") return result({ documents: [] });
    const device = models.find(item => url === `/api/client/devices/${item.id}`);
    if (device) return result(device);
    throw new Error(`Unexpected ${url}`);
  }));
  for (const item of models) {
    const view = appAt(`/client-space/devices/${item.id}`);
    const photo = await view.findByRole("img", { name: `Photo du modèle ${item.model}` });
    expect(photo.getAttribute("src")).toContain(`assets/obera-products/${item.image}`);
    expect(Boolean(photo.closest(".client-device-photo-ic22-frame"))).toBe(item.model === "IC 22");
    expect(view.getByText(`Numéro de série : ${item.serial}`)).toBeTruthy();
    cleanup();
  }
});

it("ouvre SAV ou consommables directement depuis sa carte avec le bon appareil préselectionné", async () => {
  vi.stubGlobal("fetch", vi.fn((url: string) => {
    if (url === "/api/session") return result({ role: "client", organizationIds: ["org-demo-a"] });
    if (url === "/api/client/me") return result({ organization: { name: "CLIENT DEMO ALPHA" } });
    if (url === "/api/client/devices") return result({ devices: [
      { id: deviceId, model: "IC 22", serial: "DEMO-SN-A-001", notice_available: true }
    ] });
    if (url === "/api/client/requests") return result({ requests: [] });
    if (url === "/api/client/documents") return result({ documents: [] });
    throw new Error(`Unexpected ${url}`);
  }));
  const view = appAt("/client-space");
  await view.findByText("Bienvenue, CLIENT DEMO ALPHA");
  fireEvent.click(view.getByRole("link", { name: "Demander des consommables" }));
  await waitFor(() => expect((view.getByLabelText("Type de demande") as HTMLSelectElement).value).toBe("consumables"));
  expect((view.getByLabelText("Appareil (facultatif)") as HTMLSelectElement).value).toBe(deviceId);
  fireEvent.click(view.getByRole("link", { name: "Créer une demande SAV" }));
  await waitFor(() => expect((view.getByLabelText("Type de demande") as HTMLSelectElement).value).toBe("sav"));
  expect((view.getByLabelText("Appareil concerné") as HTMLSelectElement).value).toBe(deviceId);
});

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
  fireEvent.click(view.getByRole("link", { name: "Voir l’appareil" }));
  await view.findByText("Numéro de série : DEMO-SN-A");
  fireEvent.click(view.getByRole("link", { name: "Démarrer le diagnostic" }));
  await view.findByText("Diagnostic : IC 12");
  await view.findByText("Quel est le problème principal ?");
  fireEvent.click(view.getByRole("button", { name: "L'appareil ne fait pas de froid" }));
  await view.findByText("Le ventilateur tourne mais l'air reste chaud ?");
  fireEvent.click(view.getByRole("link", { name: "Retour à mon espace" }));
  await view.findByRole("heading", { name: "Nouvelle demande" });
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

it("sépare les trois motifs Client et permet zéro, un ou plusieurs appareils pour la maintenance", async () => {
  const second = "e1000000-0000-4000-8000-000000000002";
  const submitted: Record<string, unknown>[] = [];
  vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => {
    if (url === "/api/session") return result({ role: "client", organizationIds: ["org-demo-a"] });
    if (url === "/api/client/me") return result({ organization: { name: "CLIENT DEMO ALPHA" }, role: "client" });
    if (url === "/api/client/devices") return result({ devices: [
      { id: deviceId, model: "IC 12", serial: "DEMO-SN-A" },
      { id: second, model: "DUSTOMAT 4-24", serial: "DEMO-SN-B" }
    ] });
    if (url === "/api/client/documents") return result({ documents: [] });
    if (url === "/api/client/requests" && init?.method === "POST") {
      const payload = JSON.parse(init.body as string);
      submitted.push(payload);
      return result({ id: crypto.randomUUID(), request_type: payload.requestType,
        device_id: payload.deviceId ?? null, device_ids: payload.deviceIds ?? [],
        subject: payload.subject, message: payload.message, public_status: "received",
        created_at: "2026-09-30T00:00:00Z" }, 201);
    }
    if (url === "/api/client/requests") return result({ requests: [] });
    throw new Error(`Unexpected ${url}`);
  }));
  const view = appAt("/client-space");
  await view.findByText("Bienvenue, CLIENT DEMO ALPHA");
  const type = view.getByLabelText("Type de demande");
  fireEvent.change(type, { target: { value: "consumables" } });
  expect(view.getByLabelText("Appareil (facultatif)")).toBeTruthy();
  fireEvent.change(view.getByLabelText("Objet"), { target: { value: "DEMO filtres" } });
  fireEvent.change(view.getByLabelText("Votre message"), { target: { value: "DEMO besoin" } });
  fireEvent.click(view.getByRole("button", { name: "Envoyer la demande" }));
  await waitFor(() => expect(submitted).toHaveLength(1));
  expect(submitted[0]).not.toHaveProperty("deviceId");
  expect(submitted[0]).not.toHaveProperty("deviceIds");
  fireEvent.change(type, { target: { value: "maintenance_quote" } });
  expect(view.queryByLabelText("Appareil (facultatif)")).toBeNull();
  const saveQuote = async () => {
    const previous = submitted.length;
    fireEvent.change(view.getByLabelText("Objet"), { target: { value: "DEMO devis maintenance" } });
    fireEvent.change(view.getByLabelText("Votre message"), { target: { value: "DEMO étude" } });
    fireEvent.click(view.getByRole("button", { name: "Envoyer la demande" }));
    await waitFor(() => expect(submitted).toHaveLength(previous + 1));
    await waitFor(() => expect(view.getByRole("button", { name: "Envoyer la demande" }).hasAttribute("disabled")).toBe(false));
  };
  await saveQuote();
  expect(submitted[submitted.length - 1]?.deviceIds).toEqual([]);
  fireEvent.click(view.getByRole("checkbox", { name: "IC 12 — DEMO-SN-A" }));
  await saveQuote();
  expect(submitted[submitted.length - 1]?.deviceIds).toEqual([deviceId]);
  fireEvent.click(view.getByRole("checkbox", { name: "DUSTOMAT 4-24 — DEMO-SN-B" }));
  await saveQuote();
  expect(submitted[submitted.length - 1]?.deviceIds).toEqual([deviceId, second]);
  fireEvent.change(type, { target: { value: "sav" } });
  expect(view.getByLabelText("Appareil concerné")).toBeTruthy();
});

it("transmet les réponses et confirmations du diagnostic au formulaire SAV, même après actualisation", async () => {
  const submissions: Record<string, unknown>[] = [];
  vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => {
    if (url === "/api/session") return result({ role: "client", organizationIds: ["org-demo-a"] });
    if (url === "/api/client/me") return result({ organization: { name: "CLIENT DEMO ALPHA" } });
    if (url === "/api/client/devices") return result({ devices: [{ id: deviceId, model: "IC 12", serial: "DEMO-SN-A" }] });
    if (url === `/api/client/devices/${deviceId}`) return result({ id: deviceId, model: "IC 12", serial: "DEMO-SN-A" });
    if (url === "/api/client/documents") return result({ documents: [] });
    if (url === "/api/client/requests" && init?.method === "POST") {
      submissions.push(JSON.parse(init.body as string));
      return result({ id: requestId, request_type: "sav", subject: "DEMO", public_status: "received" }, 201);
    }
    if (url === "/api/client/requests") return result({ requests: [] });
    throw new Error(`Unexpected ${url}`);
  }));
  const view = appAt(`/client-space/diagnostic/${deviceId}`);
  await view.findByText("Quel est le problème principal ?");
  fireEvent.click(view.getByRole("button", { name: "L'appareil ne s'allume pas" }));
  await view.findByText("Alimentation externe verifiee (prise/disjoncteur/cable) ?");
  fireEvent.click(view.getByRole("button", { name: "Non" }));
  await view.findByText("Verification alimentation");
  fireEvent.click(view.getByRole("checkbox", { name: /Je confirme avoir effectué/ }));
  fireEvent.click(view.getByRole("link", { name: "Contacter le SAV / créer une demande" }));
  await view.findByText(/Le parcours de diagnostic sera transmis/);
  expect((view.getByLabelText("Objet") as HTMLInputElement).value).toBe("Diagnostic : L'appareil ne s'allume pas");
  view.unmount();
  const resumed = appAt(`/client-space?type=sav&device=${deviceId}&diagnostic=1`);
  await resumed.findByText(/Le parcours de diagnostic sera transmis/);
  fireEvent.click(resumed.getByRole("button", { name: "Envoyer la demande" }));
  await waitFor(() => expect(submissions).toHaveLength(1));
  expect(submissions[0].deviceId).toBe(deviceId);
  expect(submissions[0].message).toBe("Diagnostic transmis sans commentaire supplémentaire.");
  expect(submissions[0].diagnosticContext).toEqual({ version: 1, productId: "ic12", result: "unresolved",
    steps: [{ nodeId: "start", optionIndex: 1 }, { nodeId: "no-power", optionIndex: 1 },
      { nodeId: "power-check-advice", confirmed: true }] });
  expect(sessionStorage.length).toBe(0);
  resumed.unmount();
  const direct = appAt(`/client-space?type=sav&device=${deviceId}`);
  await direct.findByText("Bienvenue, CLIENT DEMO ALPHA");
  expect((direct.getByLabelText("Appareil concerné") as HTMLSelectElement).value).toBe(deviceId);
  expect(direct.queryByText(/Le parcours de diagnostic sera transmis/)).toBeNull();
});

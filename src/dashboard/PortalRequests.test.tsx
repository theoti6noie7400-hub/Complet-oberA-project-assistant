// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PortalRequests from "./PortalRequests";

const id = "f0000000-0000-4000-8000-000000000001";
const caseId = "c0000000-0000-4000-8000-000000000001";
const record: {
  id: string; kind: "client"; request_type: "sav"; organization_name: string;
  author_identifier: string; subject: string; message: string; public_status: string;
  created_at: string; device_id: string; device_model: string; device_serial: string;
  linked_sav_case_id: string | null; linked_sav_reference: string | null;
} = {
  id, kind: "client", request_type: "sav", organization_name: "CLIENT DEMO ALPHA",
  author_identifier: "DEMO-CLIENT-A", subject: "DEMO assistance", message: "DEMO panne",
  public_status: "received", created_at: "2026-09-29T07:00:00Z",
  device_id: "e0000000-0000-4000-8000-000000000001", device_model: "IC 12",
  device_serial: "DEMO-SN-A-001", linked_sav_case_id: null, linked_sav_reference: null
};
let items: typeof record[];
let responseError = 0;
let sent: string[];
let canManage = true;
beforeEach(() => {
  items = [{ ...record }]; responseError = 0; sent = []; canManage = true;
  vi.stubGlobal("fetch", vi.fn((input: string, options?: RequestInit) => {
    sent.push(input);
    if (responseError) return Promise.resolve(Response.json({}, { status: responseError }));
    if (input.endsWith("/compatible-cases")) return Promise.resolve(Response.json({ cases: [
      { id: caseId, sav_reference: "DEMO-SAV-OWN" }
    ] }));
    if (input.endsWith("/status") && options?.method === "POST") {
      const { status } = JSON.parse(options.body as string);
      items[0] = { ...items[0], public_status: status };
      return Promise.resolve(Response.json({ id, public_status: status }));
    }
    if (input.endsWith("/sav-case") && options?.method === "POST") {
      items[0] = { ...items[0], linked_sav_case_id: caseId, linked_sav_reference: "DEMO-SAV-OWN" };
      return Promise.resolve(Response.json({ id, linked_sav_case_id: caseId }));
    }
    if (input === `/api/portal/requests/${id}`) return Promise.resolve(Response.json(items[0]));
    if (input === "/api/portal/requests")
      return Promise.resolve(Response.json({ requests: items, has_more: false, can_manage: canManage }));
    throw new Error(`Unexpected ${input}`);
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("affiche la file PostgreSQL distincte, détail puis statut et rattachement explicites", async () => {
  const view = render(<MemoryRouter><PortalRequests /></MemoryRouter>);
  fireEvent.click(await view.findByRole("button", { name: "DEMO assistance" }));
  const dialog = await view.findByRole("dialog", { name: "Détail de la demande portail" });
  await waitFor(() => expect(within(dialog).getByText("DEMO panne")).toBeTruthy());
  expect(dialog.textContent).toContain("DEMO-SN-A-001");
  expect(dialog.textContent).not.toContain(id);
  fireEvent.click(within(dialog).getByRole("button", { name: "Passer en cours" }));
  await waitFor(() => expect(within(dialog).getByRole("button", { name: "Terminer" })).toBeTruthy());
  fireEvent.change(within(dialog).getByRole("combobox", { name: "Dossier compatible" }), { target: { value: caseId } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Rattacher le dossier SAV" }));
  await waitFor(() => expect(dialog.textContent).toContain("DEMO-SAV-OWN"));
  expect(dialog.textContent).not.toContain(caseId);
  fireEvent.click(within(dialog).getByRole("button", { name: "Terminer" }));
  await waitFor(() => expect(dialog.textContent).toContain("Terminée"));
  expect(sent).toContain(`/api/portal/requests/${id}/sav-case`);
});

it("signale session refusée, réseau indisponible et reprise sans montrer les anciennes demandes", async () => {
  responseError = 403;
  const view = render(<MemoryRouter><PortalRequests /></MemoryRouter>);
  await waitFor(() => expect(view.getByRole("alert").textContent).toContain("Accès refusé"));
  expect(view.queryByText("DEMO assistance")).toBeNull();
  responseError = 0;
  fireEvent.click(view.getByRole("button", { name: "Actualiser" }));
  await view.findByRole("button", { name: "DEMO assistance" });
  responseError = 401;
  fireEvent.click(view.getByRole("button", { name: "Actualiser" }));
  await waitFor(() => expect(view.getByRole("link", { name: "Se reconnecter" })).toBeTruthy());
  expect(view.queryByText("DEMO assistance")).toBeNull();
});

it("filtre au serveur les motifs et montre les appareils d'une demande maintenance sans rattachement SAV", async () => {
  const maintenance = { ...record, id: "f0000000-0000-4000-8000-000000000002",
    request_type: "maintenance_quote", subject: "DEMO maintenance", device_id: null,
    device_model: null, device_serial: null, maintenance_devices: [
      { model: "IC 12", serial: "DEMO-SN-A-001" },
      { model: "DUSTOMAT 4-24", serial: "DEMO-SN-A-002" }
    ] };
  const paths: string[] = [];
  vi.stubGlobal("fetch", vi.fn((path: string) => {
    paths.push(path);
    if (path === "/api/portal/requests?requestType=maintenance_quote")
      return Promise.resolve(Response.json({ requests: [maintenance], has_more: false, can_manage: true }));
    if (path === "/api/portal/requests")
      return Promise.resolve(Response.json({ requests: [record, maintenance], has_more: false, can_manage: true }));
    if (path === `/api/portal/requests/${maintenance.id}`)
      return Promise.resolve(Response.json(maintenance));
    throw new Error(`Unexpected ${path}`);
  }));
  const view = render(<MemoryRouter><PortalRequests /></MemoryRouter>);
  await view.findByRole("button", { name: "DEMO assistance" });
  fireEvent.change(view.getByRole("combobox", { name: "Filtrer par motif" }),
    { target: { value: "maintenance_quote" } });
  const item = await view.findByRole("button", { name: "DEMO maintenance" });
  expect(view.queryByRole("button", { name: "DEMO assistance" })).toBeNull();
  expect(view.getByText("IC 12 — DEMO-SN-A-001, DUSTOMAT 4-24 — DEMO-SN-A-002")).toBeTruthy();
  fireEvent.click(item);
  const dialog = await view.findByRole("dialog", { name: "Détail de la demande portail" });
  await waitFor(() => expect(dialog.textContent).toContain("DEMO-SN-A-002"));
  expect(within(dialog).queryByRole("button", { name: "Rattacher le dossier SAV" })).toBeNull();
  expect(paths).not.toContain(`/api/portal/requests/${maintenance.id}/compatible-cases`);
});

it("laisse le technicien lire les demandes sans proposer les mutations administratives", async () => {
  canManage = false;
  const view = render(<MemoryRouter><PortalRequests /></MemoryRouter>);
  fireEvent.click(await view.findByRole("button", { name: "DEMO assistance" }));
  const dialog = await view.findByRole("dialog", { name: "Détail de la demande portail" });
  await waitFor(() => expect(within(dialog).getByText("DEMO panne")).toBeTruthy());
  expect(within(dialog).queryByRole("button", { name: "Passer en cours" })).toBeNull();
  expect(within(dialog).queryByRole("button", { name: "Rattacher le dossier SAV" })).toBeNull();
  expect(sent).not.toContain(`/api/portal/requests/${id}/status`);
  expect(sent).not.toContain(`/api/portal/requests/${id}/sav-case`);
});

it("affiche le parcours Client déclaré au SAV sans le transformer en cause technique", async () => {
  items = [{ ...record, diagnostic_context: {
    version: 1, graphFingerprint: "DEMO-FINGERPRINT", productId: "ic12",
    device: { id: record.device_id, model: "IC 12", serial: "DEMO-SN-A-001" },
    symptom: "L'appareil ne s'allume pas", steps: [
      { nodeId: "start", title: "Quel est le problème principal ?", answer: "L'appareil ne s'allume pas" },
      { nodeId: "power-check-advice", title: "Vérification alimentation",
        actionProposed: "DEMO contrôle proposé", clientConfirmed: false }
    ], result: "unresolved", comment: "DEMO commentaire" } } as typeof record];
  const view = render(<MemoryRouter><PortalRequests /></MemoryRouter>);
  fireEvent.click(await view.findByRole("button", { name: "DEMO assistance" }));
  const dialog = await view.findByRole("dialog", { name: "Détail de la demande portail" });
  await waitFor(() => expect(within(dialog).getByText("Parcours diagnostic transmis par le Client")).toBeTruthy());
  expect(dialog.textContent).toContain("réalisation non confirmée");
  expect(dialog.textContent).toContain("problème persistant");
  expect(dialog.textContent).not.toContain("Cause interne");
});

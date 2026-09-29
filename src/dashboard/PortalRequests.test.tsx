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
beforeEach(() => {
  items = [{ ...record }]; responseError = 0; sent = [];
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
      return Promise.resolve(Response.json({ requests: items, has_more: false }));
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

// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import InternalClientParkPage from "./InternalClientParkPage";
import { AdminAuthProvider } from "../auth/adminAuth";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("recherche le parc SAV interne et affiche modèle, série, photo et notice contrôlée", async () => {
  const alpha = "a1000000-0000-4000-8000-000000000001";
  const beta = "a1000000-0000-4000-8000-000000000002";
  const device = "e1000000-0000-4000-8000-000000000001";
  const paths: string[] = [];
  vi.stubGlobal("fetch", vi.fn((path: string) => {
    paths.push(path);
    if (path === "/api/session") return Promise.resolve(Response.json({ role: "sav_manager" }));
    if (path === "/api/sav/clients") return Promise.resolve(Response.json({ clients: [
      { id: alpha, name: "CLIENT DEMO ALPHA", external_reference: "DEMO-CL-001", device_count: 1 },
      { id: beta, name: "CLIENT DEMO BETA", external_reference: "DEMO-CL-002", device_count: 0 }
    ] }));
    if (path === `/api/sav/clients/${alpha}/devices`) return Promise.resolve(Response.json({ devices: [
      { id: device, model: "IC 22", serial: "DEMO-SN-A-001", notice_available: true }
    ] }));
    throw new Error(`Unexpected ${path}`);
  }));
  const view = render(<MemoryRouter><AdminAuthProvider><InternalClientParkPage /></AdminAuthProvider></MemoryRouter>);
  await view.findByRole("button", { name: "CLIENT DEMO ALPHA — 1 appareil(s)" });
  fireEvent.change(view.getByLabelText("Rechercher un client"), { target: { value: "ALPHA" } });
  expect(view.queryByRole("button", { name: /CLIENT DEMO BETA/ })).toBeNull();
  fireEvent.click(view.getByRole("button", { name: /CLIENT DEMO ALPHA/ }));
  const park = await view.findByRole("heading", { name: "Parc de CLIENT DEMO ALPHA" });
  expect(within(park.closest("section")!).getByText("DEMO-SN-A-001")).toBeTruthy();
  expect(view.getByRole("img", { name: "Photo du modèle IC 22" }).getAttribute("src")).toContain("ic-22.png");
  expect(view.getByRole("link", { name: "Télécharger la notice" }).getAttribute("href"))
    .toBe(`/api/sav/devices/${device}/notice`);
  await waitFor(() => expect(paths).toContain(`/api/sav/clients/${alpha}/devices`));
});

it("n'affiche aucun appareil après un refus de lecture du parc", async () => {
  const alpha = "a1000000-0000-4000-8000-000000000001";
  vi.stubGlobal("fetch", vi.fn((path: string) => path === "/api/session"
    ? Promise.resolve(Response.json({ role: "sav_manager" })) : path === "/api/sav/clients"
    ? Promise.resolve(Response.json({ clients: [{ id: alpha, name: "CLIENT DEMO ALPHA", device_count: 1 }] }))
    : Promise.resolve(Response.json({ error: "access_denied" }, { status: 403 }))));
  const view = render(<MemoryRouter><AdminAuthProvider><InternalClientParkPage /></AdminAuthProvider></MemoryRouter>);
  fireEvent.click(await view.findByRole("button", { name: /CLIENT DEMO ALPHA/ }));
  await view.findByRole("alert");
  expect(view.queryByText("DEMO-SN-A-001")).toBeNull();
});

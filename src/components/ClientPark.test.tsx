// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ClientPark, ClientDiagnosticSelector } from "./ClientPark";
import { clientProductForModel, clientProductPhoto } from "../lib/clientProductMedia";

afterEach(cleanup);
const devices = [
  { id: "a", model: "DUSTOMAT 4-24", serial: "DEMO-SN-A-002", notice_available: false },
  { id: "b", model: "IC 22", serial: "DEMO-SN-A-001", notice_available: true }
];

it("resolves only an exact catalog model/image and falls back when no photo is available", () => {
  expect(clientProductForModel("IC 22")?.id).toBe("ic22");
  expect(clientProductPhoto("IC 22", { ic22: "assets/ic22-photo.jpg" })).toBe("assets/ic22-photo.jpg");
  expect(clientProductPhoto("IC 22", { ic12: "assets/ic12-photo.jpg" })).toBeNull();
  expect(clientProductPhoto("IC 22")).toBeNull();
  expect(clientProductForModel("IC 22EC")).toBeNull();
});

it("centers the owned devices, serials, actions and notice availability", () => {
  const view = render(<MemoryRouter><ClientPark devices={devices} base="/client-space" /></MemoryRouter>);
  expect(view.getAllByText(/Numéro de série/)).toHaveLength(2);
  expect(view.getByText("DEMO-SN-A-001")).toBeTruthy();
  expect(view.getAllByRole("img", { name: /Photo indisponible/ })).toHaveLength(2);
  expect(view.getAllByRole("link", { name: "Diagnostic" })).toHaveLength(2);
  expect(view.getAllByRole("link", { name: "Créer une demande SAV" })).toHaveLength(2);
  expect(view.getAllByRole("link", { name: "Demander des consommables" })).toHaveLength(2);
  expect(view.getByRole("link", { name: "Télécharger la notice" }).getAttribute("href"))
    .toBe("/api/client/devices/b/notice");
  expect(view.getByText("Notice indisponible")).toBeTruthy();
  expect(view.queryByText("ePUR 100")).toBeNull();
});

it("greys out empty families and models absent from the client's park", () => {
  const view = render(<MemoryRouter><ClientDiagnosticSelector devices={devices} base="/client-space" /></MemoryRouter>);
  const inactive = view.getByText(/Purificateurs d'air — aucun appareil/).closest("details")!;
  expect(inactive.getAttribute("aria-disabled")).toBe("true");
  fireEvent.click(within(inactive).getByText(/Purificateurs d'air/));
  expect(inactive.open).toBe(false);
  const fresheners = view.getByText(/Rafraichisseurs d'air \(1\)/).closest("details")!;
  fireEvent.click(within(fresheners).getByText(/Rafraichisseurs d'air/));
  expect(within(fresheners).getByText(/IC 12 — non présent dans mon parc/).getAttribute("aria-disabled")).toBe("true");
  expect(within(fresheners).getByRole("link", { name: "DEMO-SN-A-001" }).getAttribute("href"))
    .toBe("/client-space/diagnostic/b");
  expect(within(fresheners).queryByRole("link", { name: /IC 12/ })).toBeNull();
});

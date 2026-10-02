// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ClientPark, ClientDiagnosticSelector } from "./ClientPark";
import { clientProductForModel, clientProductPhoto } from "../lib/clientProductMedia";
import { OBERA_PRODUCT_IMAGES } from "../assets/oberaProductImages";

afterEach(cleanup);
const devices = [
  { id: "a", model: "DUSTOMAT 4-24", serial: "DEMO-SN-A-002", notice_available: true },
  { id: "b", model: "IC 22", serial: "DEMO-SN-A-001", notice_available: true }
];

it("resolves only an exact catalog model/image and falls back when no photo is available", () => {
  expect(clientProductForModel("IC 22")?.id).toBe("ic22");
  expect(Object.keys(OBERA_PRODUCT_IMAGES).sort()).toEqual([
    "clearbox", "dustomat-424", "epur-ex-1000", "ic12", "ic22"]);
  expect(clientProductPhoto("IC 12")).toBe("assets/obera-products/ic-12.png");
  expect(clientProductPhoto("Clearbox")).toBe("assets/obera-products/clearbox.png");
  expect(clientProductPhoto("ePUR EX 1000")).toBe("assets/obera-products/epur-ex-1000.png");
  expect(clientProductPhoto("IC 22")).toBe("assets/obera-products/ic-22.png");
  expect(clientProductPhoto("DUSTOMAT 4-24")).toBe("assets/obera-products/dustomat-4-24.png");
  expect(clientProductPhoto("IC 22", { ic22: "assets/ic22-photo.jpg" })).toBe("assets/ic22-photo.jpg");
  expect(clientProductPhoto("IC 22", { ic12: "assets/ic12-photo.jpg" })).toBeNull();
  expect(clientProductPhoto("IC 12", { ic22: "assets/ic22-photo.jpg" })).toBeNull();
  expect(clientProductPhoto("DUSTOMAT 4-10")).toBeNull();
  expect(clientProductPhoto("ePUR EX 1001", { "epur-ex-1000": "assets/epur-photo.jpg" })).toBeNull();
  expect(clientProductForModel("IC 22EC")).toBeNull();
});

it("montre les trois nouvelles photos exactes sur les cartes du parc Client", () => {
  const items = [
    { id: "ic12", model: "IC 12", serial: "DEMO-SN-IC12", image: "ic-12.png" },
    { id: "clear", model: "Clearbox", serial: "DEMO-SN-CLEAR", image: "clearbox.png" },
    { id: "epur", model: "ePUR EX 1000", serial: "DEMO-SN-EPUR", image: "epur-ex-1000.png" }
  ];
  const view = render(<MemoryRouter><ClientPark devices={items} base="/client-space" /></MemoryRouter>);
  for (const item of items) {
    const photo = view.getByRole("img", { name: `Photo du modèle ${item.model}` });
    expect(photo.getAttribute("src")).toContain(`assets/obera-products/${item.image}`);
    expect(photo.classList.contains("client-device-photo")).toBe(true);
    expect(view.getByText(item.serial)).toBeTruthy();
  }
});

it("centers the owned devices, serials, actions and notice availability", () => {
  const view = render(<MemoryRouter><ClientPark devices={devices} base="/client-space" /></MemoryRouter>);
  expect(view.getAllByText(/Numéro de série/)).toHaveLength(2);
  expect(view.getByText("DEMO-SN-A-001")).toBeTruthy();
  expect(view.getByRole("img", { name: "Photo du modèle IC 22" }).getAttribute("src"))
    .toContain("assets/obera-products/ic-22.png");
  expect(view.getByRole("img", { name: "Photo du modèle IC 22" }).closest(".client-device-photo-ic22-frame"))
    .toBeTruthy();
  expect(view.getByRole("img", { name: "Photo du modèle DUSTOMAT 4-24" }).getAttribute("src"))
    .toContain("assets/obera-products/dustomat-4-24.png");
  expect(view.getByRole("img", { name: "Photo du modèle DUSTOMAT 4-24" }).closest(".client-device-photo-ic22-frame"))
    .toBeNull();
  expect(view.queryByRole("img", { name: /Photo indisponible/ })).toBeNull();
  expect(view.getAllByRole("link", { name: "Diagnostic" })).toHaveLength(2);
  expect(view.getAllByRole("link", { name: "Créer une demande SAV" })).toHaveLength(2);
  expect(view.queryByRole("link", { name: "Demander des consommables" })).toBeNull();
  expect(view.getAllByRole("link", { name: "Télécharger la notice" }).map(item => item.getAttribute("href")))
    .toEqual(["/api/client/devices/a/notice", "/api/client/devices/b/notice"]);
  expect(view.queryByText("Notice indisponible")).toBeNull();
  expect(view.queryByText("ePUR 100")).toBeNull();
});

it("conserve le placeholder pour un modèle sans image officielle ou en erreur de chargement", () => {
  const view = render(<MemoryRouter><ClientPark devices={[
    { id: "c", model: "DUSTOMAT 4-10", serial: "DEMO-SN-OTHER" },
    devices[0]
  ]} base="/client-space" /></MemoryRouter>);
  expect(view.getByRole("img", { name: "Photo indisponible pour DUSTOMAT 4-10" })).toBeTruthy();
  fireEvent.error(view.getByRole("img", { name: "Photo du modèle DUSTOMAT 4-24" }));
  expect(view.getByRole("img", { name: "Photo indisponible pour DUSTOMAT 4-24" })).toBeTruthy();
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

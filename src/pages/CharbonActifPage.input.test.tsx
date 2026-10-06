// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CharbonActifPage from "./CharbonActifPage";

afterEach(cleanup);

it("permet d'effacer puis de saisir un autre poids avec virgule, sans réinitialisation", async () => {
  const view = render(<MemoryRouter><CharbonActifPage /></MemoryRouter>);
  const input = view.container.querySelector('input[placeholder="Ex: 8,30"]') as HTMLInputElement;
  await waitFor(() => expect(input.value).toBe("7.10"));
  fireEvent.change(input, { target: { value: "" } });
  expect(input.value).toBe("");
  expect(view.getByText("Gain (adsorption)").parentElement?.querySelector(".text-2xl")?.textContent).toBe("-");
  fireEvent.change(input, { target: { value: "8,30" } });
  expect(input.value).toBe("8,30");
  expect(view.getByText("Gain (adsorption)").parentElement?.querySelector(".text-2xl")?.textContent).toBe("1.20 kg");
});

it("adapte seulement le poids de référence lorsque le filtre change, et préserve un poids saisi", async () => {
  const view = render(<MemoryRouter><CharbonActifPage /></MemoryRouter>);
  const input = view.container.querySelector('input[placeholder="Ex: 8,30"]') as HTMLInputElement;
  const filter = view.container.querySelector("select") as HTMLSelectElement;
  await waitFor(() => expect(input.value).toBe("7.10"));
  fireEvent.change(filter, { target: { value: "CAN_2600" } });
  await waitFor(() => expect(input.value).toBe("3.50"));
  fireEvent.change(input, { target: { value: "4,25" } });
  fireEvent.change(filter, { target: { value: "EPUREX_1000" } });
  expect(input.value).toBe("4,25");
});

it("cherche immédiatement l'éthanol G2 avec Tous les groupes, après reset et retour", () => {
  const renderCalculator = () => render(<MemoryRouter><CharbonActifPage /></MemoryRouter>);
  let view = renderCalculator();
  const groupSelect = () => Array.from(view.container.querySelectorAll("select"))
    .find(select => Array.from(select.options).some(option => option.value === "ALL"))!;
  expect(groupSelect().value).toBe("ALL");
  expect(groupSelect().selectedOptions[0].textContent).toBe("Tous les groupes");
  fireEvent.change(view.getByPlaceholderText("Rechercher un polluant..."), { target: { value: "Ethyl alcohol" } });
  const result = view.getByRole("button", { name: /Ethyl alcohol \(C2H6O\)/ });
  expect(result.textContent).toMatch(/Groupe 2/);
  fireEvent.click(result);
  expect(groupSelect().value).toBe("ALL");
  fireEvent.change(groupSelect(), { target: { value: "1" } });
  fireEvent.click(view.getByRole("button", { name: /Reinitialiser/i }));
  expect(groupSelect().value).toBe("ALL");
  view.unmount();
  view = renderCalculator();
  expect(groupSelect().value).toBe("ALL");
});

// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { FILTER_REFERENCES } from "../lib/charbon";
import { LanguageProvider, LanguageSwitcher, RuntimeTextTranslator } from "../i18n/language";
import CharbonActifPage from "./CharbonActifPage";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

// Le traducteur réagit dans une microtâche après le rendu React.
const afterTranslation = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function setup() {
  const view = render(
    <LanguageProvider>
      <RuntimeTextTranslator />
      <LanguageSwitcher />
      <MemoryRouter><CharbonActifPage /></MemoryRouter>
    </LanguageProvider>
  );
  const filter = view.container.querySelector("select") as HTMLSelectElement;
  const weight = view.container.querySelector('input[placeholder="Ex: 8,30"]') as HTMLInputElement;
  const gain = () => view.getByText("Gain (adsorption)").parentElement?.querySelector(".text-2xl")?.textContent;
  const saturation = () => view.getByText(/Saturation \(/).parentElement?.querySelector(".text-2xl")?.textContent;
  return { view, filter, weight, gain, saturation };
}

it.each([
  ["8.50", "1.40 kg"],
  ["8,50", "1.40 kg"],
  ["8.24", "1.14 kg"]
])("calcule EPUREX 1000 à partir du poids %s avec traduction active", async (typed, expected) => {
  const { filter, weight, gain, saturation } = setup();
  await waitFor(() => expect(weight.value).toBe("7.10"));
  expect(filter.value).toBe("EPUREX_1000");
  fireEvent.change(weight, { target: { value: typed } });
  await afterTranslation();
  await waitFor(() => {
    expect(weight.value).toBe(typed);
    expect(gain()).toBe(expected);
    expect(saturation()).toBe(typed === "8.24" ? "56 %" : "69 %");
  });
});

it("utilise les masses du MIXTE, puis chaque référence successive et ses identifiants stables", async () => {
  const { view, filter, weight, gain, saturation } = setup();
  const knownIds = Object.values(FILTER_REFERENCES).map((ref) => ref.id);
  expect(Array.from(filter.options, (option) => option.value)).toEqual(knownIds);
  await waitFor(() => expect(weight.value).toBe("7.10"));

  fireEvent.change(filter, { target: { value: "EPUREX_MIXTE_HEPA_CH" } });
  await afterTranslation();
  await waitFor(() => {
    expect(filter.value).toBe("EPUREX_MIXTE_HEPA_CH");
    expect(weight.value).toBe("7.30");
    expect(view.getByText("CHARBON EPUREX 1000 MIXTE", { selector: "div.font-medium" })).toBeTruthy();
    expect(view.getByText("3.00 kg")).toBeTruthy();
  });
  fireEvent.change(weight, { target: { value: "8.50" } });
  await afterTranslation();
  await waitFor(() => {
    expect(gain()).toBe("1.20 kg");
    expect(saturation()).toBe("114 %");
  });

  for (const id of ["CAN_2600", "PURPLE_1500", "EPUREX_1000", "EPUREX_MIXTE_HEPA_CH"]) {
    fireEvent.change(filter, { target: { value: id } });
    await afterTranslation();
    await waitFor(() => {
      expect(filter.value).toBe(id);
      expect(knownIds).toContain(filter.value);
      expect(view.getByText(FILTER_REFERENCES[id as keyof typeof FILTER_REFERENCES].label, { selector: "div.font-medium" })).toBeTruthy();
    });
  }
});

it("conserve les IDs et les résultats après FR → EN → FR", async () => {
  const { view, filter, weight, gain, saturation } = setup();
  await waitFor(() => expect(weight.value).toBe("7.10"));
  fireEvent.click(view.getByRole("button", { name: "EN" }));
  await afterTranslation();
  fireEvent.change(filter, { target: { value: "EPUREX_MIXTE_HEPA_CH" } });
  fireEvent.change(weight, { target: { value: "8,50" } });
  await afterTranslation();
  await waitFor(() => {
    expect(filter.value).toBe("EPUREX_MIXTE_HEPA_CH");
    expect(Array.from(filter.options, (option) => option.value)).toEqual(Object.values(FILTER_REFERENCES).map((ref) => ref.id));
    expect(Array.from(filter.options, (option) => option.getAttribute("value"))).toEqual(Object.values(FILTER_REFERENCES).map((ref) => ref.id));
    expect(weight.value).toBe("8,50");
    expect(gain()).toBe("1.20 kg");
    expect(saturation()).toBe("114 %");
    expect(view.getByText("3.00 kg")).toBeTruthy();
  });
  fireEvent.click(view.getByRole("button", { name: "FR" }));
  await afterTranslation();
  await waitFor(() => {
    expect(filter.value).toBe("EPUREX_MIXTE_HEPA_CH");
    expect(gain()).toBe("1.20 kg");
    expect(saturation()).toBe("114 %");
  });
});

it("ignore une valeur d'option étrangère au catalogue sans la propager dans filterId", async () => {
  const { view, filter, weight, gain } = setup();
  await waitFor(() => expect(weight.value).toBe("7.10"));
  filter.options[1].value = "UNKNOWN";
  fireEvent.change(filter, { target: { value: "UNKNOWN" } });
  fireEvent.change(weight, { target: { value: "8.50" } });
  await afterTranslation();
  expect(filter.value).toBe("EPUREX_1000");
  expect(gain()).toBe("1.40 kg");
  expect(view.getByText("CHARBON EPUREX 1000", { selector: "div.font-medium" })).toBeTruthy();
});

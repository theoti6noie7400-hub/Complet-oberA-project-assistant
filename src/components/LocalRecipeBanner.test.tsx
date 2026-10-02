// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { LanguageProvider, LanguageSwitcher } from "../i18n/language";
import LocalRecipeBanner from "./LocalRecipeBanner";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("place la langue et la réinitialisation côte à côte dans les contrôles du bandeau", () => {
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(Response.json({ private_data_loaded: false }))));
  const view = render(<LanguageProvider><LocalRecipeBanner><LanguageSwitcher /></LocalRecipeBanner></LanguageProvider>);
  const controls = view.getByRole("button", { name: "Réinitialiser les données DEMO" }).parentElement!;
  expect(controls.className).toBe("local-recipe-controls");
  expect(controls.querySelector(".language-switcher")).toBeTruthy();
  expect(controls.querySelectorAll("button")).toHaveLength(3);
  expect(view.getByText(/RECETTE INTERNE — DONNÉES DE TEST/)).toBeTruthy();
});

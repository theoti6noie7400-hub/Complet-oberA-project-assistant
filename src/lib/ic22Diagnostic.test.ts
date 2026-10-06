import { describe, expect, it } from "vitest";
import { DIAGNOSTIC_NODES, getDiagnosticStartNode, PRODUCTS } from "./assistantData";
import { resolveDiagnosticPath, type DiagnosticPath } from "./diagnosticContext";
import { IC22_DIAGNOSTIC_NODES, IC22_ERROR_MEANINGS, IC22_START,
  IC22_OPENING_NODES, IC22_PANEL_INFO, IC22_PANEL_INFO_NODES } from "./ic22Diagnostic";

const nodes = IC22_DIAGNOSTIC_NODES;
function path(...choices: number[]) {
  let id = IC22_START;
  const visited: string[] = [];
  let cursor = 0;
  for (let count = 0; count < 40; count++) {
    visited.push(id);
    const node = nodes[id];
    expect(node, `missing ${id}`).toBeTruthy();
    if (node.type === "question") {
      const choice = choices[cursor++];
      if (choice === undefined) return visited;
      id = node.options[choice]!.next;
    } else if (node.next) id = node.next;
    else return visited;
  }
  throw new Error("Graph cycle");
}

describe("IC22 / KM22 / VL220 shared L1 graph", () => {
  it("uses one entry point, nine symptoms and no transport choice", () => {
    expect(getDiagnosticStartNode("ic22")).toBe(IC22_START);
    expect(getDiagnosticStartNode("vl220")).toBe(IC22_START);
    expect(nodes[IC22_START]).toEqual(DIAGNOSTIC_NODES[IC22_START]);
    const start = nodes[IC22_START];
    expect(start.type).toBe("question");
    if (start.type !== "question") return;
    expect(start.options).toHaveLength(9);
    expect(JSON.stringify(nodes)).not.toMatch(/transport|livraison|expédition/i);
    expect(PRODUCTS.find(item => item.id === "ic12")).toBeTruthy();
  });

  it("has no orphan, missing edge, cycle or inaccessible terminal", () => {
    const seen = new Set<string>();
    const visiting = new Set<string>();
    const walk = (id: string): void => {
      expect(nodes[id], `missing ${id}`).toBeTruthy();
      if (visiting.has(id)) throw new Error(`cycle at ${id}`);
      if (seen.has(id)) return;
      visiting.add(id);
      const node = nodes[id];
      if (node.type === "question") node.options.forEach(option => walk(option.next));
      else if (node.next) walk(node.next);
      visiting.delete(id);
      seen.add(id);
    };
    walk(IC22_START);
    expect(seen.size).toBe(Object.keys(nodes).length);
    const longest = (id: string): number => {
      const node = nodes[id];
      return 1 + (node.type === "question" ? Math.max(...node.options.map(option => longest(option.next))) :
        node.next ? longest(node.next) : 0);
    };
    expect(longest(IC22_START)).toBeLessThanOrEqual(30); // server snapshot limit
  });

  it("separates blinking light, water level and float from steady light/circuit", () => {
    expect(path(0, 1)).toContain("ic22-no-air-power");
    expect(path(0, 0, 1, 1)).toContain("ic22-cooling-command-sav");
    expect(path(0, 0, 0, 0)).toContain("ic22-water-level");
    expect(path(0, 0, 0, 1)).toContain("ic22-circuit-access");
    expect(path(0, 0, 0, 2)).toContain("ic22-light-sav");
    expect(path(0, 0, 0, 0, 1, 1)).toContain("ic22-circuit-access");
    expect(path(0, 0, 0, 0, 0, 0, 2)).toContain("ic22-float-sav");
    expect(path(0, 0, 0, 0).join(" ")).not.toContain("drain");
  });

  it("explains the energized visual observation and keeps uncertainty distinct from a diagnosed pump", () => {
    const prefix = [0, 0, 0, 1, 2] as const; // cold, blows, cooling enabled, steady, circuit clear
    expect(path(...prefix, 1)).toContain("ic22-pump-unchecked-sav");
    expect(nodes["ic22-pump-unchecked-sav"]).not.toEqual(nodes["ic22-pump-replace"]);
    expect(path(...prefix, 0, 0)).toContain("ic22-pump-replace");
    expect(path(...prefix, 0, 1)).toContain("ic22-pump-replace");
    expect(path(...prefix, 0, 2)).toContain("ic22-panel-state");
    expect(path(...prefix, 0, 3)).toContain("ic22-pump-ambiguous-sav");
    expect(nodes["ic22-pump-visual-safety"]).toMatchObject({ type: "text" });
    const safety = nodes["ic22-pump-visual-safety"];
    if (safety.type === "text") {
      expect(safety.title).toContain("sous tension");
      expect(safety.body).toMatch(/uniquement visuel.*mains.*outil.*Toute manipulation.*arrêté et débranché/i);
      expect(safety.body).not.toMatch(/personne (autorisée|habilitée)/i);
      expect(safety.requiresActionConfirmation).toBe(false);
    }
    const consent = nodes["ic22-pump-visual-consent"];
    if (consent.type === "question") expect(consent.options.map(option => option.label))
      .toEqual(["Oui, continuer", "Non, contacter le SAV"]);
  });

  it("asks for a pump instead of distributing a protocol or guiding replacement", () => {
    const route = path(0, 0, 0, 1, 2, 0, 0);
    expect(route[route.length - 1]).toBe("ic22-pump-replace");
    expect(nodes["ic22-pump-replace"]).toMatchObject({ type: "text", target: "sav-pump",
      requiresActionConfirmation: false });
    expect(JSON.stringify(nodes)).not.toMatch(/PDF|personne autorisée|personne habilitée|consign|Wago/i);
  });

  it("replaces aging or scaled panels, and checks environment only at end", () => {
    for (const option of [0, 1]) expect(path(0, 0, 0, 1, 2, 0, 2, option)).toContain("ic22-panel-replace");
    expect(path(0, 0, 0, 1, 2, 0, 2, 2)).toContain("ic22-environment");
    expect(JSON.stringify(nodes["ic22-panel-replace"])).not.toMatch(/nettoyez le panneau/i);
  });

  it("limits disposable filter test to weak airflow, not leaks or lack of cooling", () => {
    expect(path(2, 1, 0)).toContain("ic22-filter-replace");
    expect(path(2, 1, 1)).toContain("ic22-filter-sav");
    expect(path(2, 0)).toContain("ic22-no-air-power");
    const entry = nodes[IC22_START];
    if (entry.type !== "question") return;
    for (const index of [0, 3]) expect(entry.options[index].next).not.toBe("ic22-filter-test");
    const filter = nodes["ic22-filter-replace"];
    if (filter.type === "text") expect(filter.body).toMatch(/jetables.*remplacez-les.*Ne les lavez pas/i);
    expect(JSON.stringify(nodes["ic22-leak-origin"])).not.toMatch(/filtre saturé/i);
  });

  it("handles unknown supply, dangerous wiring, leak panel and direct SAV symptoms", () => {
    expect(path(2, 0, 0)).toContain("ic22-no-air-sav");
    expect(path(2, 0, 1)).toContain("ic22-power-check");
    expect(path(2, 0, 2)).toContain("ic22-power-check");
    expect(path(1, 0)).toContain("ic22-power-danger");
    expect(JSON.stringify(nodes["ic22-power-check"])).not.toMatch(/multimètre/i);
    expect(path(3, 0, 0)).toContain("ic22-leak-panel-positive");
    expect(path(3, 0, 1)).toContain("ic22-leak-panel-sav");
    expect(JSON.stringify(nodes["ic22-leak-panel-positive"])).toMatch(/pas une réparation définitive/i);
    expect(IC22_OPENING_NODES.has("ic22-leak-panel-access")).toBe(true);
    expect(path(4)).toContain("ic22-oscillation-sav");
    expect(path(5)).toContain("ic22-noise-sav");
    expect(path(8)).toContain("ic22-other-sav");
  });

  it("maps every validated error code to its meaning and SAV without invented repair", () => {
    for (const [index, [code, meaning]] of Object.entries(IC22_ERROR_MEANINGS).entries()) {
      const route = path(6, index);
      const terminal = nodes[route[route.length - 1]];
      expect(terminal.title).toContain(code);
      expect(terminal.title).toContain(meaning);
      expect(terminal.type === "text" && terminal.target).toBe("sav");
      expect(JSON.stringify(terminal)).not.toMatch(/remplacer le (moteur|capteur|potentiomètre)/i);
    }
    expect(path(6, 13)).toContain("ic22-code-other");
  });

  it("resolves recent panel odor, forwards Probioway, drains, age and ambient branches", () => {
    expect(path(7, 0, 0)).toContain("ic22-odor-restored");
    expect(path(7, 0, 1)).toContain("ic22-odor-probioway-sav");
    expect(path(7, 1, 1, 0)).toContain("ic22-odor-restored");
    expect(path(7, 1, 1, 1, 0)).toContain("ic22-odor-panel-replace");
    const aging = nodes["ic22-odor-panel-replace"];
    expect(aging).toMatchObject({ type: "text", target: "sav", requiresActionConfirmation: false });
    if (aging.type === "text") expect(aging.traceSummary)
      .toBe("Odeur persistante — panneau de plus d’un an — remplacement conseillé.");
    expect(JSON.stringify(nodes)).not.toMatch(/Après remplacement, l’odeur a-t-elle disparu/);
    expect(IC22_PANEL_INFO_NODES.has("ic22-odor-panel-replace")).toBe(true);
    expect(IC22_PANEL_INFO).toMatch(/absorber et répartir.*ruissellement.*odeurs/);
    expect(path(7, 1, 0, 1, 1)).toContain("ic22-odor-probioway-sav");
    const advice = nodes["ic22-odor-drain-advice"];
    if (advice.type === "text") expect(advice.body).toMatch(/1 à 3 vidanges par semaine/);
  });

  it("requires confirmation for actual controls, not information or recommendations", () => {
    for (const id of ["ic22-float-access", "ic22-reseat-hose", "ic22-filter-test",
      "ic22-leak-panel-access", "ic22-odor-drain-advice", "ic22-power-check"])
      expect(nodes[id]).toMatchObject({ requiresActionConfirmation: true });
    for (const id of ["ic22-panel-replace", "ic22-odor-panel-replace", "ic22-pump-replace",
      "ic22-leak-panel-positive", "ic22-odor-new-info"])
      expect(nodes[id]).toMatchObject({ requiresActionConfirmation: false });
  });

  it("retains the exact aging-panel trace in the SAV snapshot and rejects forged confirmations", () => {
    const path: DiagnosticPath = { version: 1, productId: "ic22", result: "unresolved", steps: [
      { nodeId: "ic22-start", optionIndex: 7 },
      { nodeId: "ic22-odor-new", optionIndex: 1 },
      { nodeId: "ic22-odor-drains", optionIndex: 0 },
      { nodeId: "ic22-odor-panel-age", optionIndex: 0 },
      { nodeId: "ic22-odor-panel-replace" }
    ] };
    expect(resolveDiagnosticPath(path, "IC 22")?.steps[4].actionProposed)
      .toContain("Odeur persistante — panneau de plus d’un an — remplacement conseillé.");
    expect(resolveDiagnosticPath({ ...path, steps: [...path.steps.slice(0, -1),
      { nodeId: "ic22-odor-panel-replace", confirmed: true }] }, "IC 22")).toBeNull();
    const water: DiagnosticPath = { version: 1, productId: "ic22", result: "unresolved", steps: [
      { nodeId: "ic22-start", optionIndex: 1 },
      { nodeId: "ic22-power-check", continued: true },
      { nodeId: "ic22-power-result", optionIndex: 2 },
      { nodeId: "ic22-power-sav" }
    ] };
    expect(resolveDiagnosticPath(water, "IC 22")).toBeNull();
    water.steps[1].confirmed = true;
    expect(resolveDiagnosticPath(water, "IC 22")).not.toBeNull();
  });
});

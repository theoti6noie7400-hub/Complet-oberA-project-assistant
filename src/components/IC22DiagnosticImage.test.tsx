// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import IC22DiagnosticImage from "./IC22DiagnosticImage";
import { IC22_DIAGNOSTIC_NODES, IC22_BASIN_IMAGE_NODE_IDS,
  IC22_BASIN_ANNOTATED_IMAGE_URL } from "../lib/ic22Diagnostic";

afterEach(cleanup);

it("shows the exact photo only at relevant controls and opens its full size", () => {
  expect(IC22_BASIN_ANNOTATED_IMAGE_URL).toBe("/assets/ic22-interieur-annote.png");
  expect([...IC22_BASIN_IMAGE_NODE_IDS]).toEqual([
    "ic22-float-access", "ic22-circuit-access", "ic22-pump-visual-safety", "ic22-leak-circuit-access",
    "ic22-swing-access", "ic22-swing-reseat", "ic22-swing-visual-safety"
  ]);
  for (const nodeId of Object.keys(IC22_DIAGNOSTIC_NODES)) {
    const view = render(<IC22DiagnosticImage nodeId={nodeId} />);
    if (IC22_BASIN_IMAGE_NODE_IDS.has(nodeId)) {
      expect(view.getByText("Repérez les éléments sur l’image avant d’effectuer le contrôle.")).toBeTruthy();
      const img = view.getByRole("img");
      const link = view.getByRole("link", { name: "Agrandir la photo annotée IC22 / KM22 / VL220" });
      expect(img.getAttribute("src"))
        .toBe(`${import.meta.env.BASE_URL}${IC22_BASIN_ANNOTATED_IMAGE_URL.replace(/^\/+/, "")}`);
      expect(link.getAttribute("href")).toBe(img.getAttribute("src"));
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noreferrer");
    } else expect(view.queryByRole("img")).toBeNull();
    view.unmount();
  }
});

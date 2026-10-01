import assert from "node:assert/strict";
import { test } from "node:test";
import { diagnosticGraphDescriptor, fingerprintDiagnosticGraph } from "./diagnostic-fingerprint.ts";

test("fingerprint identifies node content, product entry point and model-specific routing", () => {
  const descriptor = diagnosticGraphDescriptor();
  const original = fingerprintDiagnosticGraph(descriptor);
  assert.match(original, /^[a-f0-9]{64}$/);
  assert.equal(fingerprintDiagnosticGraph(), original);
  assert.ok(descriptor.products.length > 0);

  const entryChanged = structuredClone(descriptor);
  entryChanged.products[0].startNode = "DEMO-OTHER-START";
  assert.notEqual(fingerprintDiagnosticGraph(entryChanged), original);

  const routeChanged = structuredClone(descriptor);
  routeChanged.products[0].resolvedEdges[0][1] = "DEMO-OTHER-NEXT";
  assert.notEqual(fingerprintDiagnosticGraph(routeChanged), original);

  const contentChanged = structuredClone(descriptor);
  contentChanged.nodes.start.title = "DEMO-OTHER-TITLE";
  assert.notEqual(fingerprintDiagnosticGraph(contentChanged), original);
});

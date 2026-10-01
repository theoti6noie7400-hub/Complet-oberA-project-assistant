import { createHash } from "node:crypto";
import { DIAGNOSTIC_NODES, PRODUCTS, getDiagnosticStartNode,
  resolveDynamicNext } from "../../src/lib/assistantData.ts";

// Include all product entry points and model-specific dynamic edges, not only
// the node text. A change to routing must produce a different fingerprint.
export function diagnosticGraphDescriptor() {
  const nextIds = [...new Set(Object.values(DIAGNOSTIC_NODES).flatMap(node =>
    node.type === "question" ? node.options.map(option => option.next) : node.next ? [node.next] : []))].sort();
  return {
    nodes: DIAGNOSTIC_NODES,
    products: PRODUCTS.map(product => ({
      id: product.id, name: product.name, category: product.category,
      startNode: getDiagnosticStartNode(product.id),
      resolvedEdges: nextIds.map(next => [next, resolveDynamicNext(next, product.id)])
    }))
  };
}

export function fingerprintDiagnosticGraph(descriptor = diagnosticGraphDescriptor()): string {
  return createHash("sha256").update(JSON.stringify(descriptor)).digest("hex");
}

import { DIAGNOSTIC_NODES, PRODUCTS, getDiagnosticStartNode, resolveDynamicNext } from "./assistantData.ts";

// The path contains identifiers and choices only. Labels are recovered from the
// existing graph on the server, and device details come from PostgreSQL.
export type DiagnosticChoice = {
  nodeId: string;
  optionIndex?: number;
  continued?: true;
  confirmed?: boolean;
};
export type DiagnosticPath = {
  version: 1;
  productId: string;
  steps: DiagnosticChoice[];
  result: "unresolved";
};
export type DiagnosticStepSummary = {
  nodeId: string;
  title: string;
  answer?: string;
  actionProposed?: string;
  clientConfirmed?: boolean;
};

export function resolveDiagnosticPath(path: DiagnosticPath, deviceModel: string):
  { symptom: string; steps: DiagnosticStepSummary[] } | null {
  if (!path || typeof path !== "object" || path.version !== 1 || path.result !== "unresolved" || !Array.isArray(path.steps) ||
      !path.steps.length || path.steps.length > 30) return null;
  const product = PRODUCTS.find(item => item.id === path.productId);
  if (!product || product.name.trim().toLocaleLowerCase("fr") !== deviceModel.trim().toLocaleLowerCase("fr"))
    return null;
  let expected = getDiagnosticStartNode(product.id);
  const seen = new Set<string>();
  const summary: DiagnosticStepSummary[] = [];
  let symptom = "";
  for (const [index, step] of path.steps.entries()) {
    if (!step || typeof step !== "object" || step.nodeId !== expected || seen.has(expected)) return null;
    seen.add(expected);
    const node = DIAGNOSTIC_NODES[expected];
    if (!node) return null;
    if (node.type === "question") {
      if (!Number.isInteger(step.optionIndex) || step.optionIndex! < 0 ||
          step.optionIndex! >= node.options.length || step.continued !== undefined ||
          step.confirmed !== undefined || index === path.steps.length - 1) return null;
      const selected = node.options[step.optionIndex!];
      summary.push({ nodeId: node.id, title: node.title, answer: selected.label });
      if (!symptom) symptom = selected.label;
      expected = resolveDynamicNext(selected.next, product.id);
    } else {
      if (step.optionIndex !== undefined || (step.confirmed !== undefined &&
          typeof step.confirmed !== "boolean")) return null;
      if (node.requiresActionConfirmation === true && step.confirmed !== true) return null;
      if (node.requiresActionConfirmation === false && step.confirmed !== undefined) return null;
      summary.push({ nodeId: node.id, title: node.title,
        actionProposed: node.traceSummary ? `${node.body}\n${node.traceSummary}` : node.body,
        ...(step.confirmed === undefined ? {} : { clientConfirmed: step.confirmed }) });
      if (node.next) {
        if (step.continued !== true || index === path.steps.length - 1) return null;
        expected = resolveDynamicNext(node.next, product.id);
      } else if (step.continued !== undefined || index !== path.steps.length - 1) return null;
      if (!symptom) symptom = node.title;
    }
  }
  return { symptom, steps: summary };
}

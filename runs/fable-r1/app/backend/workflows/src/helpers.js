// Small helpers for authoring Conductor workflow definitions as code.
// The generated JSON in backend/workflows/*.json is what gets registered.

export const OWNER_EMAIL = "chaos-commerce@example.com";

// Scripts are written as multi-line template literals and collapsed to one line,
// so they must not contain comments or string literals that span lines.
export const oneLine = (script) => script.replace(/\s*\n\s*/g, " ").trim();

export const jq = (ref, inputs, query) => ({
  name: ref,
  taskReferenceName: ref,
  type: "JSON_JQ_TRANSFORM",
  inputParameters: { ...inputs, queryExpression: oneLine(query) },
});

export const inline = (ref, inputs, script) => ({
  name: ref,
  taskReferenceName: ref,
  type: "INLINE",
  inputParameters: { ...inputs, evaluatorType: "graaljs", expression: oneLine(script) },
});

export const wait = (ref, inputs) => ({
  name: ref,
  taskReferenceName: ref,
  type: "WAIT",
  inputParameters: inputs,
});

// Lets an operator (or the end-to-end test) fail the workflow on purpose to prove
// that the rescue workflow still produces a result.
export const drillGate = (reason) => ({
  name: "drill_gate",
  taskReferenceName: "drill_gate",
  type: "SWITCH",
  evaluatorType: "value-param",
  expression: "disasterDrill",
  inputParameters: { disasterDrill: "${workflow.input.disasterDrill}" },
  decisionCases: {
    true: [
      {
        name: "drill_collapse",
        taskReferenceName: "drill_collapse",
        type: "TERMINATE",
        inputParameters: { terminationStatus: "FAILED", terminationReason: reason },
      },
    ],
  },
  defaultCase: [],
});

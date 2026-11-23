// Static checks on the workflow definitions.

import assert from "node:assert/strict";
import { test } from "node:test";
import { buildWorkflows, listTasks, staleWorkflows } from "../../conductor/build.mjs";

const definitions = buildWorkflows();
const byName = Object.fromEntries(definitions.map((definition) => [definition.name, definition]));

test("conductor/workflows/*.json match their sources", () => {
  assert.deepEqual(staleWorkflows(), [], 'run "npm run build:workflows"');
});

test("the four workflows exist and are wired to their safety nets", () => {
  assert.deepEqual(Object.keys(byName).sort(), ["chaos_checkout", "chaos_checkout_rescue", "chaos_returns", "chaos_returns_default_decision"]);
  assert.equal(byName.chaos_checkout.failureWorkflow, "chaos_checkout_rescue");
  assert.equal(byName.chaos_returns.failureWorkflow, "chaos_returns_default_decision");
  for (const name of ["chaos_checkout", "chaos_returns"]) {
    assert.equal(byName[name].timeoutPolicy, "TIME_OUT_WF");
    assert.ok(byName[name].timeoutSeconds > 0);
  }
});

test("no workflow needs a worker, an HTTP call or an LLM", () => {
  const allowed = new Set(["JSON_JQ_TRANSFORM", "DO_WHILE", "WAIT", "SWITCH"]);
  for (const definition of definitions) {
    for (const task of listTasks(definition.tasks)) {
      assert.ok(allowed.has(task.type), `${definition.name}.${task.taskReferenceName} is a ${task.type}`);
    }
  }
});

test("every loop is capped and every wait is bounded", () => {
  for (const definition of definitions) {
    const tasks = listTasks(definition.tasks);
    const references = tasks.map((task) => task.taskReferenceName);
    assert.equal(new Set(references).size, references.length, `${definition.name} has duplicate task reference names`);
    for (const task of tasks) {
      if (task.type === "DO_WHILE") {
        assert.equal(task.evaluatorType, "graaljs");
        assert.match(task.loopCondition, /\['iteration'\] < \d+|i < \d+/, `${task.taskReferenceName} has an iteration cap`);
      }
      if (task.type === "WAIT") {
        assert.match(task.inputParameters.duration, /^\$\{intake\.output\.result\.(checkPause|oathWindow)\}$/, `${task.taskReferenceName} waits for a clamped duration`);
      }
      if (task.type === "JSON_JQ_TRANSFORM") {
        assert.equal(typeof task.inputParameters.queryExpression, "string");
        assert.ok(!task.inputParameters.queryExpression.includes("$jq"));
      }
    }
  }
});

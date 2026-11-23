// Static checks on the workflow definitions: the properties that make "always completes" true.
import test from "node:test";
import assert from "node:assert/strict";
import { workflowDefs, checkoutDef, returnsDef, FORM_WAIT_SECONDS, CHECKS_TOTAL } from "../src/workflows.mjs";

function allTasks(tasks, out = []) {
  for (const task of tasks ?? []) {
    out.push(task);
    allTasks(task.loopOver, out);
    for (const branch of task.forkTasks ?? []) allTasks(branch, out);
    for (const branch of Object.values(task.decisionCases ?? {})) allTasks(branch, out);
    allTasks(task.defaultCase, out);
  }
  return out;
}

for (const def of workflowDefs) {
  const tasks = allTasks(def.tasks);

  test(`${def.name}: has the metadata the review checklist asks for`, () => {
    assert.ok(def.description.length > 40);
    assert.ok(def.ownerEmail);
    assert.equal(def.schemaVersion, 2);
    assert.ok(def.timeoutSeconds > 0);
    // ALERT_ONLY on purpose: a slow checkout is flagged, never killed.
    assert.equal(def.timeoutPolicy, "ALERT_ONLY");
  });

  test(`${def.name}: task reference names are unique`, () => {
    const refs = tasks.map((task) => task.taskReferenceName);
    assert.equal(new Set(refs).size, refs.length);
  });

  test(`${def.name}: uses only system tasks, so no worker can leave it hanging`, () => {
    const allowed = new Set(["JSON_JQ_TRANSFORM", "INLINE", "DO_WHILE", "SWITCH", "FORK_JOIN", "JOIN", "WAIT"]);
    for (const task of tasks) assert.ok(allowed.has(task.type), `${task.taskReferenceName} is ${task.type}`);
    assert.ok(!tasks.some((task) => task.type === "SIMPLE" || task.type === "HTTP"));
  });

  test(`${def.name}: every $.name used in a script is declared in inputParameters`, () => {
    for (const task of tasks) {
      const source = task.type === "INLINE" ? task.inputParameters.expression : task.type === "DO_WHILE" ? task.loopCondition : task.type === "SWITCH" && task.evaluatorType === "graaljs" ? task.expression : null;
      if (!source) continue;
      const declared = new Set(Object.keys(task.inputParameters ?? {}));
      // A DO_WHILE condition may also read the outputs of its own loop tasks by reference name.
      for (const inner of task.loopOver ?? []) declared.add(inner.taskReferenceName);
      for (const [, name] of source.matchAll(/\$\.([A-Za-z_][A-Za-z0-9_]*)/g)) {
        assert.ok(declared.has(name), `${task.taskReferenceName} reads $.${name} but does not declare it`);
      }
    }
  });

  test(`${def.name}: scripts cannot fail the workflow`, () => {
    for (const task of tasks) {
      if (task.type === "JSON_JQ_TRANSFORM") assert.match(task.inputParameters.queryExpression, /try \(.*\) catch /s, task.taskReferenceName);
      if (task.type === "INLINE") assert.match(task.inputParameters.expression, /^\(function \(\) \{.*\}\)\(\);$/s, task.taskReferenceName);
      if (task.type === "DO_WHILE") {
        assert.equal(task.evaluatorType, "graaljs");
        assert.match(task.loopCondition, /iteration\b.*<\s*\d+/s, `${task.taskReferenceName} needs an iteration cap`);
      }
    }
  });
}

test("chaos_checkout: payment falls back to an IOU by default", () => {
  const outcome = checkoutDef.tasks.find((task) => task.taskReferenceName === "payment_outcome");
  assert.deepEqual(Object.keys(outcome.decisionCases), ["paid"]);
  assert.equal(outcome.defaultCase[0].taskReferenceName, "accept_iou");
});

test("chaos_returns: the form wait is a fixed, bounded duration and every route decides", () => {
  const wait = returnsDef.tasks.find((task) => task.type === "WAIT");
  assert.match(wait.inputParameters.duration, /^\d+s$/); // a literal: a null duration would wait forever
  assert.ok(FORM_WAIT_SECONDS > 0 && FORM_WAIT_SECONDS <= 60);
  assert.equal(CHECKS_TOTAL, 7);
  const route = returnsDef.tasks.find((task) => task.taskReferenceName === "route_decision");
  assert.deepEqual(Object.keys(route.decisionCases).sort(), ["APPROVED", "DENIED"]);
  assert.equal(route.defaultCase[0].taskReferenceName, "issue_store_credit");
});

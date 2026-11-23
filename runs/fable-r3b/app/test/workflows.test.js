import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { existsSync, readFileSync } from 'node:fs';
import { workflowDefinitions, CHECKOUT_WORKFLOW, RETURN_WORKFLOW, MANAGER_REVIEW_TASK } from '../workflows/index.js';
import * as backendNames from '../backend/src/views.js';

function allTasks(tasks) {
  return tasks.flatMap((task) => [task, ...allTasks(task.loopOver || [])]);
}

test('the backend and the workflow definitions agree on names', () => {
  assert.equal(backendNames.CHECKOUT_WORKFLOW, CHECKOUT_WORKFLOW);
  assert.equal(backendNames.RETURN_WORKFLOW, RETURN_WORKFLOW);
  assert.equal(backendNames.MANAGER_REVIEW_TASK, MANAGER_REVIEW_TASK);
});

for (const definition of workflowDefinitions) {
  const tasks = allTasks(definition.tasks);

  test(`${definition.name}: needs no worker and nothing that can wait forever`, () => {
    const allowed = new Set(['INLINE', 'DO_WHILE', 'JSON_JQ_TRANSFORM', 'WAIT']);
    for (const task of tasks) assert.ok(allowed.has(task.type), `${task.taskReferenceName} is a ${task.type}`);
    for (const task of tasks.filter((entry) => entry.type === 'WAIT')) {
      assert.match(task.inputParameters.duration, /^\d+s$/, 'every WAIT must end by itself');
    }
    assert.equal(definition.timeoutPolicy, 'ALERT_ONLY');
  });

  test(`${definition.name}: task reference names are unique`, () => {
    const names = tasks.map((task) => task.taskReferenceName);
    assert.equal(new Set(names).size, names.length);
  });

  test(`${definition.name}: loops are capped and scripts only read declared inputs`, () => {
    for (const task of tasks) {
      const script = task.type === 'INLINE' ? task.inputParameters.expression : task.type === 'DO_WHILE' ? task.loopCondition : null;
      if (script === null) continue;
      if (task.type === 'DO_WHILE') {
        assert.equal(task.evaluatorType, 'graaljs');
        assert.match(task.loopCondition, new RegExp(`\\$\\.${task.taskReferenceName}\\['iteration'\\] < \\d+`));
      }
      const declared = new Set(Object.keys(task.inputParameters));
      for (const [, name] of script.matchAll(/\$\.([A-Za-z_]\w*)/g)) {
        assert.ok(declared.has(name), `${task.taskReferenceName} reads $.${name} without declaring it`);
      }
    }
  });

  test(`${definition.name}: every INLINE expression is self-contained`, () => {
    for (const task of tasks.filter((entry) => entry.type === 'INLINE')) {
      // A bare context: only `$` exists, as in Conductor's GraalJS sandbox.
      const result = vm.runInNewContext(task.inputParameters.expression, { $: {} });
      assert.equal(typeof result, 'object', task.taskReferenceName);
    }
  });

  test(`${definition.name}: the JSON file in workflows/definitions is up to date`, () => {
    const file = new URL(`../workflows/definitions/${definition.name}.json`, import.meta.url);
    assert.ok(existsSync(file), 'run `npm run build:workflows`');
    assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), JSON.parse(JSON.stringify(definition)), 'run `npm run build:workflows`');
  });
}

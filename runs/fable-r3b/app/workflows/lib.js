import { HELPERS } from './scripts.js';

export const OWNER_EMAIL = process.env.WORKFLOW_OWNER_EMAIL || 'chaos-commerce@example.com';

// Turns a script function into a self-contained GraalJS expression: the
// helpers' sources are inlined ahead of the function, which is then called
// with the task's `$`.
export function inlineExpression(fn) {
  const helpers = HELPERS.map((helper) => helper.toString()).join('\n');
  return `(function(){\n${helpers}\nreturn (${fn.toString()})($);\n})();`;
}

export function inline(refName, fn, inputs) {
  return {
    name: refName,
    taskReferenceName: refName,
    type: 'INLINE',
    inputParameters: { evaluatorType: 'graaljs', expression: inlineExpression(fn), ...inputs },
  };
}

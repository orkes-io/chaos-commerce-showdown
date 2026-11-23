import { readFileSync } from "node:fs";

const load = (file) => JSON.parse(readFileSync(new URL(`../workflows/${file}`, import.meta.url), "utf8"));

export const checkoutDef = load("chaos_checkout.json");
export const returnsDef = load("chaos_returns.json");
export const workflowDefs = [checkoutDef, returnsDef];

export const FORM_TASK_REF = "await_form_27b6";
export const CHECK_TASK_REF = "run_pointless_check";

const formTask = returnsDef.tasks.find((task) => task.taskReferenceName === FORM_TASK_REF);
export const FORM_WAIT_SECONDS = Number.parseInt(formTask?.inputParameters?.duration ?? "15", 10) || 15;

const checksLoop = returnsDef.tasks.find((task) => task.taskReferenceName === "pointless_checks");
export const CHECKS_TOTAL = Number(/iteration < (\d+)/.exec(checksLoop?.loopCondition ?? "")?.[1] ?? 7);

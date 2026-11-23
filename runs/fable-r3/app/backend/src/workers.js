// Conductor workers for every SIMPLE task in the two workflows. The task
// logic lives in ./domain as plain functions; this file only adapts them to
// the official SDK's poll loop.
//
// Workers are idempotent: each one is a deterministic function of its input,
// so a redelivered task produces the same output.

import { orkesConductorClient, TaskHandler } from "@io-orkes/conductor-javascript";
import { pathToFileURL } from "node:url";

import { loadConfig } from "./config.js";
import { createConductorClient } from "./conductor.js";
import { bookShipping, reserveInventory } from "./domain/fulfilment.js";
import { chargePayment } from "./domain/payment.js";
import { priceCart } from "./domain/pricing.js";
import { decideReturn, issueRefund, lookupOrder, pointlessCheck } from "./domain/returns.js";

// taskDefName -> (input, deps) => output. Names must match conductor/taskdefs.json.
export function taskFunctions({ conductor }) {
  return {
    chaos_price_cart: (input) => priceCart(input),
    chaos_charge_payment: (input) => chargePayment(input),
    chaos_reserve_inventory: (input) => reserveInventory(input),
    chaos_book_shipping: (input) => bookShipping(input),
    chaos_lookup_order: (input) => lookupOrder(input, (id) => conductor.getWorkflow(id, { includeTasks: false })),
    chaos_pointless_check: (input) => pointlessCheck(input),
    chaos_decide_return: (input) => decideReturn(input),
    chaos_issue_refund: (input) => issueRefund(input),
  };
}

export const TASK_NAMES = Object.keys(taskFunctions({ conductor: null }));

const quietLogger = {
  debug() {},
  info() {},
  warn: (...args) => console.warn("[workers]", ...args),
  error: (...args) => console.error("[workers]", ...args),
};

export async function startWorkers(config = loadConfig(), { log = console.log } = {}) {
  const conductor = createConductorClient(config);
  const functions = taskFunctions({ conductor });

  const workers = Object.entries(functions).map(([taskDefName, run]) => ({
    taskDefName,
    concurrency: 5,
    pollInterval: 100,
    // A thrown error is reported to Conductor as FAILED and retried per the
    // task definition; the workflows then fall back if the retry fails too.
    execute: async (task) => ({
      status: "COMPLETED",
      outputData: await run(task.inputData || {}),
    }),
  }));

  const client = await orkesConductorClient({
    serverUrl: config.conductorUrl,
    keyId: config.conductorAuthKey || undefined,
    keySecret: config.conductorAuthSecret || undefined,
    logger: quietLogger,
  });
  const handler = new TaskHandler({ client, workers, scanForDecorated: false, logger: quietLogger });
  await handler.startWorkers();
  log(`[workers] polling ${config.conductorUrl} for ${workers.length} task types`);
  return handler;
}

// `node src/workers.js` runs the workers as a long-lived process.
if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const handler = await startWorkers();
  const stop = async () => {
    await handler.stopWorkers();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

import { handleAppRequest } from "./app.js";
import { drainWorkerQueuesOnce, registerChaosDefinitions } from "./conductor.js";

let definitionsEnsured = false;

async function ensureRegisteredOnce(): Promise<void> {
  if (definitionsEnsured) return;
  if (process.env.AUTO_REGISTER_WORKFLOWS === "false") {
    definitionsEnsured = true;
    return;
  }
  await registerChaosDefinitions();
  definitionsEnsured = true;
}

/**
 * AWS Lambda HTTP Handler — compatible with API Gateway HTTP API (v2),
 * API Gateway REST API (v1), and AWS Lambda Function URLs.
 * Reads CONDUCTOR_SERVER_URL (and optional CONDUCTOR_AUTH_KEY / CONDUCTOR_AUTH_SECRET) from environment configuration.
 */
export async function handler(event: any) {
  await ensureRegisteredOnce();

  const method =
    event?.requestContext?.http?.method ||
    event?.httpMethod ||
    "GET";
  const rawPath =
    event?.rawPath ||
    event?.path ||
    "/";

  let queryString = event?.rawQueryString || "";
  if (!queryString && event?.queryStringParameters) {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(event.queryStringParameters)) {
      if (v !== undefined && v !== null) usp.set(k, String(v));
    }
    queryString = usp.toString();
  }

  let bodyText = "";
  if (typeof event?.body === "string") {
    bodyText = event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf8")
      : event.body;
  } else if (event?.body && typeof event.body === "object") {
    bodyText = JSON.stringify(event.body);
  }

  const res = await handleAppRequest({
    method,
    path: rawPath,
    query: new URLSearchParams(queryString),
    headers: event?.headers || {},
    bodyText
  });

  if (Buffer.isBuffer(res.body)) {
    return {
      statusCode: res.statusCode,
      headers: res.headers,
      body: res.body.toString("base64"),
      isBase64Encoded: true
    };
  }

  return {
    statusCode: res.statusCode,
    headers: res.headers,
    body: res.body
  };
}

/**
 * Optional standalone AWS Lambda Worker Handler (e.g., triggered by EventBridge schedule)
 * for draining Conductor SIMPLE task queues in serverless deployments.
 */
export async function workerHandler() {
  await ensureRegisteredOnce();
  let totalProcessed = 0;
  for (let pass = 0; pass < 5; pass += 1) {
    const count = await drainWorkerQueuesOnce("chaos-scheduled-lambda-worker");
    totalProcessed += count;
    if (count === 0) break;
  }
  return { ok: true, tasksProcessed: totalProcessed };
}

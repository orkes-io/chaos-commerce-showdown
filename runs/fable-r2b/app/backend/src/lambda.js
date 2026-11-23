// AWS Lambda entry point. Works behind an API Gateway HTTP API or a Lambda
// Function URL (payload format 2.0) and behind a REST API (format 1.0).

import { createApp } from "./app.js";

let app;

export async function handler(event) {
  app ??= createApp();
  const headers = Object.fromEntries(
    Object.entries(event.headers ?? {}).map(([name, value]) => [name.toLowerCase(), value]),
  );
  const body =
    event.body == null ? null : event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
  return app({
    method: event.requestContext?.http?.method ?? event.httpMethod,
    path: event.rawPath ?? event.path,
    headers,
    body,
  });
}

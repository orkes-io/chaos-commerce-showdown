// AWS Lambda entry point. Works with API Gateway HTTP APIs and Lambda Function URLs (payload v2)
// as well as API Gateway REST APIs (payload v1).   Handler: src/lambda.handler
import { createApp } from "./app.mjs";

let app;

export async function handler(event = {}) {
  app ??= createApp();
  const method = event.requestContext?.http?.method ?? event.httpMethod ?? "GET";
  const path = event.rawPath ?? event.path ?? "/";
  let body = event.body ?? "";
  if (body && event.isBase64Encoded) body = Buffer.from(body, "base64").toString("utf8");

  const response = await app.handle({ method, path, body });
  return { statusCode: response.status, headers: response.headers, body: response.body };
}

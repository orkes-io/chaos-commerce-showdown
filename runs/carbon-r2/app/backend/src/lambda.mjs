import { handleApiRequest } from "./app.mjs";

/**
 * AWS Lambda entrypoint supporting:
 * - API Gateway HTTP API (payload v2.0)
 * - API Gateway REST API (payload v1.0)
 * - AWS Lambda Function URLs
 */
export async function handler(event) {
  const method =
    event?.requestContext?.http?.method ||
    event?.httpMethod ||
    "GET";

  const pathname =
    event?.rawPath ||
    event?.path ||
    "/api/health";

  let rawBody = event?.body || "";
  if (rawBody && event?.isBase64Encoded) {
    rawBody = Buffer.from(rawBody, "base64").toString("utf8");
  }

  const response = await handleApiRequest({
    method,
    pathname,
    headers: event?.headers || {},
    body: rawBody,
  });

  return {
    statusCode: response.statusCode,
    headers: response.headers,
    body: response.body,
  };
}

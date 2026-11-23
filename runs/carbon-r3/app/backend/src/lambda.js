import { handleApiRequest } from "./app.js";

/**
 * AWS Lambda entrypoint supporting:
 * - API Gateway HTTP API (payloadFormatVersion 2.0)
 * - API Gateway REST API (payloadFormatVersion 1.0)
 * - AWS Lambda Function URLs
 */
export async function handler(event, context) {
  if (context) {
    context.callbackWaitsForEmptyEventLoop = false;
  }

  const method =
    event?.requestContext?.http?.method ||
    event?.httpMethod ||
    "GET";

  const rawPath =
    event?.rawPath ||
    event?.path ||
    "/api/health";

  // Strip optional API Gateway stage prefix (e.g., /Prod/api/catalog -> /api/catalog)
  const stage = event?.requestContext?.stage;
  let pathname = rawPath;
  if (stage && stage !== "$default" && pathname.startsWith(`/${stage}/`)) {
    pathname = pathname.slice(stage.length + 1);
  }

  const query = event?.queryStringParameters || {};

  let parsedBody = null;
  if (event?.body) {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf8")
      : event.body;
    try {
      parsedBody = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
    } catch {
      parsedBody = {};
    }
  }

  return handleApiRequest({
    method,
    pathname,
    query,
    body: parsedBody
  });
}

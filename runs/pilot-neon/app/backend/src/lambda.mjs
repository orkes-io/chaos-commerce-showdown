import { routeApiRequest } from "./router.mjs";

/**
 * AWS Lambda handler supporting API Gateway HTTP API v2 and REST API v1.
 * Reads CONDUCTOR_SERVER_URL and CORS_ORIGIN from Lambda environment variables.
 */
export async function handler(event) {
  const method =
    event?.requestContext?.http?.method ||
    event?.httpMethod ||
    "GET";

  const rawPath =
    event?.rawPath ||
    event?.path ||
    "/api/health";

  // Strip optional stage prefix (e.g. /prod/api/...) if present
  const apiIdx = rawPath.indexOf("/api");
  const pathname = apiIdx >= 0 ? rawPath.slice(apiIdx) : rawPath;

  const query = event?.queryStringParameters || {};

  let parsedBody = null;
  if (event?.body) {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf8")
      : event.body;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      parsedBody = { raw: rawBody };
    }
  }

  const response = await routeApiRequest({
    method,
    pathname,
    query,
    body: parsedBody,
  });

  return {
    statusCode: response.statusCode,
    headers: response.headers,
    body: response.body,
  };
}

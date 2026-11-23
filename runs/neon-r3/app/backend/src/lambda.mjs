import { handleApiRequest } from './app.mjs';

/**
 * AWS Lambda handler supporting API Gateway HTTP API (v2.0),
 * API Gateway REST API (v1.0), and Lambda Function URLs.
 */
export async function handler(event) {
  const method =
    event?.requestContext?.http?.method ||
    event?.httpMethod ||
    'GET';

  const rawPath =
    event?.rawPath ||
    event?.path ||
    '/';

  let body = event?.body || '';
  if (body && event?.isBase64Encoded) {
    body = Buffer.from(body, 'base64').toString('utf8');
  }

  const response = await handleApiRequest({
    method,
    path: rawPath,
    query: event?.queryStringParameters || {},
    headers: event?.headers || {},
    body,
  });

  return {
    statusCode: response.statusCode,
    headers: response.headers,
    body: response.body,
  };
}

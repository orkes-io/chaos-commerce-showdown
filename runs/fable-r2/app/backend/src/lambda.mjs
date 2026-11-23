// AWS Lambda entry point. Handles API Gateway HTTP API / Function URL events (payload v2),
// REST API events (payload v1) and the EventBridge schedule that runs the rescue sweep.

import { createApp } from './app.mjs';

let app;

function toRequest(event) {
  const headers = Object.fromEntries(Object.entries(event.headers ?? {}).map(([name, value]) => [name.toLowerCase(), value]));
  const body = event.body && event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  return {
    method: event.requestContext?.http?.method ?? event.httpMethod ?? 'GET',
    path: event.rawPath ?? event.path ?? '/',
    headers,
    body: body ?? '',
  };
}

export async function handler(event = {}) {
  app ??= createApp();

  if (event.source === 'aws.events' || event['detail-type'] === 'Scheduled Event') {
    return app.reconcile();
  }

  const response = await app.handle(toRequest(event));
  return { statusCode: response.status, headers: response.headers, body: response.body };
}

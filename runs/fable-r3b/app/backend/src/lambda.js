// AWS Lambda entry point for API Gateway HTTP APIs and Lambda Function URLs
// (payload format 2.0). All configuration comes from environment variables.
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { ConductorClient } from './conductor.js';

const config = loadConfig();
const app = createApp({
  config,
  conductor: new ConductorClient({
    baseUrl: config.conductorUrl,
    authKey: config.conductorAuthKey,
    authSecret: config.conductorAuthSecret,
  }),
});

export async function handler(event) {
  const body = event.body && event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  const response = await app({
    method: event.requestContext?.http?.method,
    path: event.rawPath,
    body: body ?? '',
  });
  return { statusCode: response.status, headers: response.headers, body: response.body };
}

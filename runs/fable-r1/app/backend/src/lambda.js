// AWS Lambda entry point. Works behind a Lambda Function URL or an API Gateway HTTP API
// (payload format 2.0), and also accepts the older REST API (1.0) event shape.

import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { ConductorClient } from "./conductor.js";

let app = null;

const getApp = () => {
  if (!app) {
    const config = loadConfig();
    const conductor = new ConductorClient({
      baseUrl: config.conductorUrl,
      authKey: config.conductorAuthKey,
      authSecret: config.conductorAuthSecret,
    });
    app = createApp({ config, conductor });
  }
  return app;
};

const lowercaseKeys = (headers) =>
  Object.fromEntries(Object.entries(headers ?? {}).map(([name, value]) => [name.toLowerCase(), value]));

export const handler = async (event) => {
  const body =
    event.body && event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : (event.body ?? null);
  const response = await getApp()({
    method: event.requestContext?.http?.method ?? event.httpMethod ?? "GET",
    path: event.rawPath ?? event.path ?? "/",
    headers: lowercaseKeys(event.headers),
    body,
  });
  return { statusCode: response.status, headers: response.headers, body: response.body };
};

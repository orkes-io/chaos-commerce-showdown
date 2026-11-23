import serverless from "serverless-http";
import { loadConfig } from "./config.mjs";
import { createApp } from "./app.mjs";

const config = loadConfig();
const app = createApp({
  config,
  serveStatic: false,
});

export const handler = serverless(app);

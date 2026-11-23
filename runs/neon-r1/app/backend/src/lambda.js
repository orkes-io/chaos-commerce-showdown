import serverless from "serverless-http";
import { createApp } from "./app.js";

const app = createApp();

// AWS Lambda handler compatible with API Gateway HTTP API (v2) and REST API (v1)
export const handler = serverless(app);

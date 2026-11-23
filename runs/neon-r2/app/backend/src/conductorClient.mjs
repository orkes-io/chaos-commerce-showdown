import { loadConfig } from "./config.mjs";

export class ConductorApiClient {
  constructor(config = loadConfig()) {
    this.config = config;
    this.token = null;
    this.tokenExpiresAt = 0;
  }

  get baseUrl() {
    return this.config.conductorServerUrl;
  }

  get uiUrl() {
    return this.config.conductorUiUrl;
  }

  async getAuthHeaders() {
    const { conductorAuthKey, conductorAuthSecret } = this.config;
    if (!conductorAuthKey || !conductorAuthSecret) {
      return {};
    }
    const now = Date.now();
    if (this.token && now < this.tokenExpiresAt) {
      return { "X-Authorization": this.token };
    }
    const res = await fetch(`${this.baseUrl}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keyId: conductorAuthKey,
        keySecret: conductorAuthSecret,
      }),
    });
    if (!res.ok) {
      throw new Error(`Conductor token exchange failed with status ${res.status}`);
    }
    const data = await res.json();
    this.token = data.token;
    this.tokenExpiresAt = now + 50 * 60 * 1000;
    return { "X-Authorization": this.token };
  }

  async request(path, options = {}) {
    const authHeaders = await this.getAuthHeaders();
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...authHeaders,
        ...(options.headers || {}),
      },
      body:
        options.body !== undefined && typeof options.body !== "string"
          ? JSON.stringify(options.body)
          : options.body,
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(
        `Conductor API ${options.method || "GET"} ${path} failed (${res.status}): ${text.slice(0, 400)}`
      );
    }
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  async healthCheck() {
    const workflows = await this.request("/metadata/workflow");
    return {
      ok: true,
      conductorServerUrl: this.baseUrl,
      conductorUiUrl: this.uiUrl,
      registeredWorkflowCount: Array.isArray(workflows) ? workflows.length : 0,
    };
  }

  async registerTaskDefs(taskDefs) {
    return this.request("/metadata/taskdefs", {
      method: "POST",
      body: taskDefs,
    });
  }

  async registerWorkflowDefs(workflowDefs) {
    return this.request("/metadata/workflow", {
      method: "PUT",
      body: workflowDefs,
    });
  }

  async startWorkflow(name, input, correlationId) {
    const qs = correlationId ? `?correlationId=${encodeURIComponent(correlationId)}` : "";
    const workflowId = await this.request(`/workflow/${encodeURIComponent(name)}${qs}`, {
      method: "POST",
      headers: { Accept: "text/plain" },
      body: input,
    });
    return String(workflowId).replace(/^"|"$/g, "").trim();
  }

  async getWorkflow(workflowId, includeTasks = true) {
    return this.request(
      `/workflow/${encodeURIComponent(workflowId)}?includeTasks=${includeTasks ? "true" : "false"}`
    );
  }

  async searchWorkflows(workflowType, size = 20) {
    const query = `workflowType IN (${workflowType})`;
    const params = new URLSearchParams({
      size: String(size),
      sort: "startTime:DESC",
      query,
    });
    return this.request(`/workflow/search?${params.toString()}`);
  }

  async waitForCompletion(workflowId, { timeoutMs = 20000, pollIntervalMs = 200 } = {}) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const execution = await this.getWorkflow(workflowId, true);
      if (
        execution &&
        ["COMPLETED", "FAILED", "TIMED_OUT", "TERMINATED"].includes(execution.status)
      ) {
        return execution;
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
    return this.getWorkflow(workflowId, true);
  }
}

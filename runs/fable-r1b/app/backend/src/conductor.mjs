// Minimal Conductor REST client (no SDK: the Lambda bundle stays dependency-free).

export class ConductorError extends Error {
  constructor(message, { status = 0, unreachable = false, body = "" } = {}) {
    super(message);
    this.name = "ConductorError";
    this.status = status;
    this.unreachable = unreachable;
    this.body = body;
  }
}

export class ConductorClient {
  constructor(config, fetchImpl = globalThis.fetch) {
    this.baseUrl = config.conductorUrl;
    this.timeoutMs = config.conductorTimeoutMs;
    this.authKey = config.conductorAuthKey;
    this.authSecret = config.conductorAuthSecret;
    this.token = config.conductorAuthToken || "";
    this.fetch = fetchImpl;
  }

  async #authHeaders() {
    if (!this.token && this.authKey && this.authSecret) {
      const res = await this.#raw("POST", "/token", {
        body: { keyId: this.authKey, keySecret: this.authSecret },
        auth: false,
      });
      this.token = res?.token ?? "";
    }
    return this.token ? { "X-Authorization": this.token } : {};
  }

  async #raw(method, path, { query, body, auth = true } = {}) {
    const url = new URL(this.baseUrl + path);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }
    const headers = { Accept: "application/json, text/plain" };
    if (auth) Object.assign(headers, await this.#authHeaders());
    if (body !== undefined) headers["Content-Type"] = "application/json";

    let res;
    try {
      res = await this.fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (cause) {
      throw new ConductorError(`Conductor is unreachable at ${this.baseUrl} (${cause?.name ?? "error"})`, {
        unreachable: true,
      });
    }
    const text = await res.text();
    if (!res.ok) {
      throw new ConductorError(`Conductor answered ${res.status} for ${method} ${path}`, {
        status: res.status,
        unreachable: res.status >= 502 && res.status <= 504,
        body: text.slice(0, 500),
      });
    }
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  request(method, path, options) {
    return this.#raw(method, path, options);
  }

  // PUT is an idempotent upsert, so registering twice (or on every start) is safe.
  registerWorkflows(definitions) {
    return this.#raw("PUT", "/metadata/workflow", { body: definitions });
  }

  async getWorkflowDef(name, version) {
    try {
      return await this.#raw("GET", `/metadata/workflow/${encodeURIComponent(name)}`, { query: { version } });
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  startWorkflow({ name, version, correlationId, input }) {
    return this.#raw("POST", "/workflow", { body: { name, version, correlationId, input } });
  }

  async getWorkflow(workflowId) {
    try {
      return await this.#raw("GET", `/workflow/${encodeURIComponent(workflowId)}`, { query: { includeTasks: true } });
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  // Oldest execution for a correlation id (our public order / return number), or null.
  async findByCorrelation(name, correlationId) {
    const list = await this.#raw(
      "GET",
      `/workflow/${encodeURIComponent(name)}/correlated/${encodeURIComponent(correlationId)}`,
      { query: { includeClosed: true, includeTasks: true } },
    );
    if (!Array.isArray(list) || list.length === 0) return null;
    return [...list].sort((a, b) => (a.createTime ?? a.startTime ?? 0) - (b.createTime ?? b.startTime ?? 0))[0];
  }

  completeTask(workflowId, taskRefName, output) {
    return this.#raw(
      "POST",
      `/tasks/${encodeURIComponent(workflowId)}/${encodeURIComponent(taskRefName)}/COMPLETED`,
      { body: output ?? {} },
    );
  }

  retryWorkflow(workflowId) {
    return this.#raw("POST", `/workflow/${encodeURIComponent(workflowId)}/retry`);
  }

  restartWorkflow(workflowId) {
    return this.#raw("POST", `/workflow/${encodeURIComponent(workflowId)}/restart`);
  }

  async health() {
    // /health lives at the server root, next to /api.
    const root = this.baseUrl.replace(/\/api$/, "");
    try {
      const res = await this.fetch(`${root}/health`, { signal: AbortSignal.timeout(Math.min(this.timeoutMs, 3000)) });
      if (res.ok) {
        const body = await res.json().catch(() => ({}));
        return body.healthy !== false;
      }
    } catch {
      // fall through to the API probe below
    }
    try {
      await this.#raw("GET", "/metadata/workflow/names");
      return true;
    } catch {
      return false;
    }
  }
}

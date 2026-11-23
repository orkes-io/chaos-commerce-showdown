export class ConductorError extends Error {
  constructor(message, { status = 0, unavailable = false } = {}) {
    super(message);
    this.name = 'ConductorError';
    this.status = status;
    // true when the server could not be reached or answered 5xx
    this.unavailable = unavailable;
  }
}

// Minimal Conductor REST client (fetch only, no SDK) so the Lambda bundle has
// no dependencies. Key/secret auth is used only when both are configured.
export class ConductorClient {
  constructor({ baseUrl, authKey = '', authSecret = '', timeoutMs = 7000, startTimeoutMs = 12000, fetchImpl = fetch }) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.authKey = authKey;
    this.authSecret = authSecret;
    this.timeoutMs = timeoutMs;
    // Starting runs the workflow's first tasks inside the call, so it is slower.
    this.startTimeoutMs = startTimeoutMs;
    this.fetch = fetchImpl;
    this.token = null;
  }

  async #send(method, path, { query, body, headers = {}, timeoutMs = this.timeoutMs } = {}) {
    const url = new URL(this.baseUrl + path);
    for (const [key, value] of Object.entries(query || {})) url.searchParams.set(key, String(value));
    try {
      return await this.fetch(url, {
        method,
        headers: { accept: 'application/json, text/plain', ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...headers },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (cause) {
      throw new ConductorError(`Conductor is unreachable at ${this.baseUrl} (${cause.name}: ${cause.message})`, { unavailable: true });
    }
  }

  async #authHeaders(forceRefresh = false) {
    if (!this.authKey || !this.authSecret) return {};
    if (!this.token || forceRefresh) {
      const response = await this.#send('POST', '/token', { body: { keyId: this.authKey, keySecret: this.authSecret } });
      if (!response.ok) {
        throw new ConductorError(`Conductor rejected the configured access key (HTTP ${response.status})`, { status: response.status });
      }
      this.token = (await response.json()).token;
    }
    return { 'x-authorization': this.token };
  }

  // Returns the parsed body; `null` for 404 when `notFoundIsNull` is set.
  async request(method, path, { query, body, notFoundIsNull = false, timeoutMs } = {}) {
    let response = await this.#send(method, path, { query, body, timeoutMs, headers: await this.#authHeaders() });
    if (response.status === 401 && this.authKey) {
      response = await this.#send(method, path, { query, body, timeoutMs, headers: await this.#authHeaders(true) });
    }
    const raw = await response.text();
    if (response.status === 404 && notFoundIsNull) return null;
    if (!response.ok) {
      let detail = raw.slice(0, 300);
      try {
        detail = JSON.parse(raw).message || detail;
      } catch {
        // not JSON; keep the raw text
      }
      throw new ConductorError(`Conductor ${method} ${path} failed with HTTP ${response.status}: ${detail}`, {
        status: response.status,
        unavailable: response.status >= 500,
      });
    }
    if (raw === '') return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  async startWorkflow({ name, correlationId, input }) {
    const id = await this.request('POST', '/workflow', { body: { name, correlationId, input }, timeoutMs: this.startTimeoutMs });
    if (typeof id !== 'string' || id === '') throw new ConductorError(`Conductor did not return a workflow id for ${name}`);
    return id;
  }

  getWorkflow(workflowId, { includeTasks = true } = {}) {
    return this.request('GET', `/workflow/${encodeURIComponent(workflowId)}`, { query: { includeTasks }, notFoundIsNull: true });
  }

  async getCorrelated(name, correlationId) {
    const list = await this.request('GET', `/workflow/${encodeURIComponent(name)}/correlated/${encodeURIComponent(correlationId)}`, {
      query: { includeClosed: true, includeTasks: false },
    });
    return Array.isArray(list) ? list : [];
  }

  terminateWorkflow(workflowId, reason) {
    return this.request('DELETE', `/workflow/${encodeURIComponent(workflowId)}`, { query: { reason } });
  }

  completeTask(workflowId, taskReferenceName, output) {
    return this.request('POST', `/tasks/${encodeURIComponent(workflowId)}/${encodeURIComponent(taskReferenceName)}/COMPLETED`, { body: output });
  }

  // PUT is an upsert: creates the definitions or updates them in place.
  registerWorkflows(definitions) {
    return this.request('PUT', '/metadata/workflow', { body: definitions });
  }

  getWorkflowDefinition(name) {
    return this.request('GET', `/metadata/workflow/${encodeURIComponent(name)}`, { notFoundIsNull: true });
  }
}

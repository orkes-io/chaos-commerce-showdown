// Minimal Conductor REST client. Uses only endpoints that exist on Conductor OSS and
// Orkes, and needs nothing but fetch (built into Node 18+).

export class ConductorError extends Error {
  constructor(message, { status = 0, retryable = false, cause } = {}) {
    super(message, { cause });
    this.name = "ConductorError";
    this.status = status;
    this.retryable = retryable;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class ConductorClient {
  constructor({ baseUrl, authKey = "", authSecret = "", timeoutMs = 8000, fetchImpl = fetch }) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.authKey = authKey;
    this.authSecret = authSecret;
    this.timeoutMs = timeoutMs;
    this.fetch = fetchImpl;
    this.token = null;
  }

  async #send(method, path, body, headers = {}) {
    let response;
    try {
      response = await this.fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { accept: "application/json", ...(body === undefined ? {} : { "content-type": "application/json" }), ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (cause) {
      throw new ConductorError(`Conductor is unreachable at ${this.baseUrl} (${cause.name}: ${cause.message})`, {
        retryable: true,
        cause,
      });
    }
    const text = await response.text();
    let payload = text;
    try {
      payload = text === "" ? null : JSON.parse(text);
    } catch {
      // Some endpoints (start workflow) answer with a bare string.
    }
    if (!response.ok) {
      const detail = payload && typeof payload === "object" ? payload.message : text;
      throw new ConductorError(`Conductor ${method} ${path} failed with ${response.status}: ${detail || "no detail"}`, {
        status: response.status,
        retryable: response.status >= 500 || response.status === 429,
      });
    }
    return payload;
  }

  // Orkes / Enterprise servers need a token exchanged from a key and secret. OSS needs nothing.
  async #authHeaders() {
    if (!this.authKey || !this.authSecret) return {};
    if (!this.token) {
      const result = await this.#send("POST", "/token", { keyId: this.authKey, keySecret: this.authSecret });
      this.token = result?.token ?? null;
      if (!this.token) throw new ConductorError("Conductor did not return an access token", { status: 401 });
    }
    return { "X-Authorization": this.token };
  }

  async request(method, path, body) {
    try {
      return await this.#send(method, path, body, await this.#authHeaders());
    } catch (error) {
      if (error.status !== 401 || !this.token) throw error;
      this.token = null;
      return this.#send(method, path, body, await this.#authHeaders());
    }
  }

  // Reads are safe to repeat, so transient failures are retried here.
  async read(path, attempts = 3) {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.request("GET", path);
      } catch (error) {
        if (!error.retryable || attempt >= attempts) throw error;
        await sleep(150 * attempt);
      }
    }
  }

  startWorkflow({ name, version, input, correlationId }) {
    return this.request("POST", "/workflow", { name, version, input, correlationId });
  }

  // Returns null when the execution does not exist.
  async getWorkflow(workflowId) {
    try {
      return await this.read(`/workflow/${encodeURIComponent(workflowId)}?includeTasks=true`);
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  async findByCorrelationId(name, correlationId) {
    const found = await this.read(
      `/workflow/${encodeURIComponent(name)}/correlated/${encodeURIComponent(correlationId)}?includeClosed=true&includeTasks=false`,
    );
    return Array.isArray(found) ? found : [];
  }

  completeTask({ workflowId, taskId, output }) {
    return this.request("POST", "/tasks", {
      workflowInstanceId: workflowId,
      taskId,
      status: "COMPLETED",
      outputData: output,
    });
  }

  // PUT creates or updates, so registering is safe to repeat.
  registerWorkflows(definitions) {
    return this.request("PUT", "/metadata/workflow", definitions);
  }

  async hasWorkflowDefinition(name, version) {
    try {
      await this.read(`/metadata/workflow/${encodeURIComponent(name)}?version=${version}`, 1);
      return true;
    } catch (error) {
      if (error.status === 404) return false;
      throw error;
    }
  }
}

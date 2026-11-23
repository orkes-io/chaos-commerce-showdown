// Minimal Conductor REST client for the API side of the backend (start a
// workflow, read an execution, register definitions). Workers use the
// official SDK's poll loop instead; see workers.js.

export class ConductorError extends Error {
  constructor(message, { status = 0, cause } = {}) {
    super(message, { cause });
    this.name = "ConductorError";
    this.status = status;
  }

  // True when Conductor could not be reached or failed on its side, as
  // opposed to rejecting the request.
  get unavailable() {
    return this.status === 0 || this.status >= 500;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function createConductorClient(config, { fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  const base = config.conductorUrl;
  let token = null;

  async function authHeaders() {
    if (!config.conductorAuthKey || !config.conductorAuthSecret) return {};
    if (!token) {
      const response = await fetchImpl(`${base}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId: config.conductorAuthKey, keySecret: config.conductorAuthSecret }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) throw new ConductorError("Conductor rejected the configured credentials", { status: response.status });
      token = (await response.json()).token;
    }
    return { "X-Authorization": token };
  }

  // `attempts` > 1 is only used for calls that are safe to repeat.
  async function request(method, path, { query, body, attempts = 1 } = {}) {
    const url = new URL(`${base}${path}`);
    for (const [key, value] of Object.entries(query || {})) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }

    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const response = await fetchImpl(url, {
          method,
          headers: {
            Accept: "application/json, text/plain",
            ...(body === undefined ? {} : { "Content-Type": "application/json" }),
            ...(await authHeaders()),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: AbortSignal.timeout(timeoutMs),
        });
        const text = await response.text();
        if (response.status === 401 && token) token = null;
        if (!response.ok) {
          let detail = text.slice(0, 300);
          try {
            detail = JSON.parse(text).message || detail;
          } catch {
            // Not JSON; keep the raw text.
          }
          throw new ConductorError(`Conductor ${method} ${path} failed with ${response.status}: ${detail}`, { status: response.status });
        }
        if (!text) return null;
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      } catch (error) {
        lastError = error instanceof ConductorError
          ? error
          : new ConductorError(`Conductor is unreachable at ${base} (${error.message})`, { cause: error });
        if (!lastError.unavailable || attempt === attempts) throw lastError;
        await sleep(250 * attempt);
      }
    }
    throw lastError;
  }

  return {
    baseUrl: base,

    async isHealthy() {
      try {
        await request("GET", "/metadata/workflow/names-and-versions");
        return true;
      } catch {
        return false;
      }
    },

    // Both calls are upserts, so registering is safe to repeat on every start.
    async registerTaskDefs(taskDefs) {
      await request("POST", "/metadata/taskdefs", { body: taskDefs, attempts: 3 });
    },
    async registerWorkflows(workflowDefs) {
      await request("PUT", "/metadata/workflow", { body: workflowDefs, attempts: 3 });
    },
    async listTaskDefNames() {
      const defs = await request("GET", "/metadata/taskdefs", { attempts: 3 });
      return (Array.isArray(defs) ? defs : []).map((def) => def.name);
    },

    // Not repeated automatically: a retry after a lost response could start a
    // second execution. Callers de-duplicate with findByCorrelationId first.
    async startWorkflow({ name, version, input, correlationId }) {
      const id = await request("POST", "/workflow", { body: { name, version, input, correlationId } });
      if (typeof id !== "string" || !id) throw new ConductorError("Conductor did not return a workflow id");
      return id.replace(/^"|"$/g, "");
    },

    async getWorkflow(workflowId, { includeTasks = true } = {}) {
      try {
        return await request("GET", `/workflow/${encodeURIComponent(workflowId)}`, { query: { includeTasks }, attempts: 3 });
      } catch (error) {
        if (error instanceof ConductorError && error.status === 404) return null;
        throw error;
      }
    },

    // Reads the execution store directly (not the search index), so an
    // execution is visible here as soon as it has been started.
    async findByCorrelationId(name, correlationId) {
      const found = await request("GET", `/workflow/${encodeURIComponent(name)}/correlated/${encodeURIComponent(correlationId)}`, {
        query: { includeClosed: true, includeTasks: false },
        attempts: 3,
      });
      return Array.isArray(found) ? found : [];
    },

    // Asks Conductor to evaluate the execution now instead of at its next
    // background sweep. Used to make overdue-task timeouts take effect promptly.
    async nudge(workflowId) {
      try {
        await request("PUT", `/workflow/decide/${encodeURIComponent(workflowId)}`);
      } catch {
        // Best effort: the background sweeper will get to it regardless.
      }
    },
  };
}

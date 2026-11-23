// Minimal Conductor REST client built on fetch, so the Lambda bundle has no
// dependencies. Only the endpoints the store needs are covered.

export class ConductorError extends Error {
  constructor(message, { status = 0, unavailable = false } = {}) {
    super(message);
    this.name = "ConductorError";
    this.status = status;
    // True when Conductor could not be reached or answered with a 5xx.
    this.unavailable = unavailable;
  }
}

export function createConductorClient({
  baseUrl,
  authKey = "",
  authSecret = "",
  authToken = "",
  fetchImpl = globalThis.fetch,
  timeoutMs = 10000,
}) {
  let cachedToken = authToken ? { value: authToken, expiresAt: Infinity } : null;

  async function send(method, path, { query, body, headers = {} } = {}) {
    if (!baseUrl) {
      throw new ConductorError("CONDUCTOR_SERVER_URL is not configured.", { unavailable: true });
    }
    const url = new URL(baseUrl + path);
    for (const [key, value] of Object.entries(query ?? {})) url.searchParams.set(key, String(value));
    let response;
    try {
      response = await fetchImpl(url, {
        method,
        headers: { accept: "application/json", ...(body === undefined ? {} : { "content-type": "application/json" }), ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      throw new ConductorError(`Conductor is unreachable at ${baseUrl} (${error.cause?.code ?? error.name}).`, {
        unavailable: true,
      });
    }
    const text = await response.text();
    if (!response.ok) {
      let detail = text.slice(0, 300);
      try {
        detail = JSON.parse(text).message ?? detail;
      } catch {
        // Not JSON; keep the raw text.
      }
      throw new ConductorError(`Conductor ${method} ${path} failed with ${response.status}: ${detail}`, {
        status: response.status,
        unavailable: response.status >= 500,
      });
    }
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  // Orkes servers exchange a key and secret for a short-lived token. Plain
  // open-source servers need no credentials and skip this entirely.
  async function authHeaders() {
    if (!cachedToken && !(authKey && authSecret)) return {};
    if (!cachedToken || cachedToken.expiresAt < Date.now()) {
      const reply = await send("POST", "/token", { body: { keyId: authKey, keySecret: authSecret } });
      if (!reply?.token) throw new ConductorError("Conductor did not return an access token.", { status: 401 });
      cachedToken = { value: reply.token, expiresAt: Date.now() + 20 * 60 * 1000 };
    }
    return { "x-authorization": cachedToken.value };
  }

  async function request(method, path, options = {}) {
    return send(method, path, { ...options, headers: await authHeaders() });
  }

  const orNullOn404 = (error) => {
    if (error instanceof ConductorError && error.status === 404) return null;
    throw error;
  };

  return {
    baseUrl,

    async startWorkflow({ name, version, input, correlationId }) {
      const id = await request("POST", "/workflow", { body: { name, version, input, correlationId } });
      if (typeof id !== "string" || !id) throw new ConductorError("Conductor did not return a workflow id.");
      return id;
    },

    getWorkflow(workflowId, { includeTasks = false } = {}) {
      return request("GET", `/workflow/${encodeURIComponent(workflowId)}`, { query: { includeTasks } }).catch(orNullOn404);
    },

    // Executions of a workflow that were started with this correlation id, oldest first.
    async findByCorrelation(name, correlationId) {
      const found = await request(
        "GET",
        `/workflow/${encodeURIComponent(name)}/correlated/${encodeURIComponent(correlationId)}`,
        { query: { includeClosed: true, includeTasks: false } },
      );
      return (Array.isArray(found) ? found : []).sort((a, b) => (a.createTime ?? 0) - (b.createTime ?? 0));
    },

    completeTask(workflowId, taskReferenceName, output) {
      return request(
        "POST",
        `/tasks/${encodeURIComponent(workflowId)}/${encodeURIComponent(taskReferenceName)}/COMPLETED`,
        { body: output },
      );
    },

    // Asks Conductor to re-evaluate a workflow now; this is what enforces an overdue workflow timeout.
    decide(workflowId) {
      return request("PUT", `/workflow/decide/${encodeURIComponent(workflowId)}`);
    },

    registerWorkflows(definitions) {
      return request("PUT", "/metadata/workflow", { body: definitions });
    },

    getWorkflowDefinition(name) {
      return request("GET", `/metadata/workflow/${encodeURIComponent(name)}`).catch(orNullOn404);
    },

    listTaskDefinitions() {
      return request("GET", "/metadata/taskdefs");
    },
  };
}

// Minimal Conductor REST client (Node 18+ fetch, no dependencies).

export class ConductorError extends Error {
  constructor(message, { status = 0, cause } = {}) {
    super(message, { cause });
    this.name = 'ConductorError';
    this.status = status;
  }

  // True when Conductor could not be reached or answered with a server-side error.
  get unavailable() {
    return this.status === 0 || this.status >= 500;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function createConductorClient(config, { fetchImpl = fetch } = {}) {
  const base = config.conductorUrl;
  let token = config.conductorAuthToken || '';

  // Orkes-style servers exchange a key pair for a short-lived token; OSS servers need none.
  async function fetchToken() {
    const res = await fetchImpl(`${base}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyId: config.conductorAuthKey, keySecret: config.conductorAuthSecret }),
      signal: AbortSignal.timeout(config.conductorTimeoutMs),
    });
    if (!res.ok) throw new ConductorError(`Conductor rejected the configured credentials (HTTP ${res.status})`, { status: res.status });
    token = (await res.json()).token;
  }

  async function once(method, path, body) {
    if (!token && config.conductorAuthKey && config.conductorAuthSecret) await fetchToken();
    let res;
    try {
      res = await fetchImpl(`${base}${path}`, {
        method,
        headers: {
          Accept: 'application/json, text/plain',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(token ? { 'X-Authorization': token } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(config.conductorTimeoutMs),
      });
    } catch (cause) {
      throw new ConductorError(`Could not reach Conductor at ${base}: ${cause.message}`, { cause });
    }
    const text = await res.text();
    if (!res.ok) {
      throw new ConductorError(`Conductor ${method} ${path} failed with HTTP ${res.status}: ${text.slice(0, 300)}`, { status: res.status });
    }
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  // Reads and definition upserts are safe to repeat, so they retry through brief outages.
  // An expired key-pair token is refreshed once for any call.
  async function request(method, path, body, { retries = 0 } = {}) {
    const canRefresh = Boolean(config.conductorAuthKey && config.conductorAuthSecret && !config.conductorAuthToken);
    let refreshed = false;
    let attempt = 0;
    for (;;) {
      try {
        return await once(method, path, body);
      } catch (error) {
        if (error.status === 401 && canRefresh && !refreshed) {
          refreshed = true;
          token = '';
          continue;
        }
        if (!(error instanceof ConductorError && error.unavailable) || attempt >= retries) throw error;
        await sleep(200 * 2 ** attempt);
        attempt += 1;
      }
    }
  }

  const enc = encodeURIComponent;

  return {
    baseUrl: base,

    async isHealthy() {
      try {
        await once('GET', '/metadata/workflow/names-and-versions');
        return true;
      } catch {
        return false;
      }
    },

    registerWorkflows(definitions) {
      return request('PUT', '/metadata/workflow', definitions, { retries: 2 });
    },

    async listWorkflowVersions() {
      return (await request('GET', '/metadata/workflow/names-and-versions', undefined, { retries: 2 })) ?? {};
    },

    // Returns the new workflow id. Not retried here: callers check for an existing execution first.
    startWorkflow({ name, version, input, correlationId }) {
      return request('POST', '/workflow', { name, version, input, correlationId });
    },

    async getWorkflow(workflowId, { includeTasks = false } = {}) {
      try {
        return await request('GET', `/workflow/${enc(workflowId)}?includeTasks=${includeTasks}`, undefined, { retries: 2 });
      } catch (error) {
        if (error.status === 404) return null;
        throw error;
      }
    },

    // Every execution of `name` started with this correlation id, oldest first.
    async findByCorrelation(name, correlationId, { includeTasks = false } = {}) {
      const found = await request(
        'GET',
        `/workflow/${enc(name)}/correlated/${enc(correlationId)}?includeClosed=true&includeTasks=${includeTasks}`,
        undefined,
        { retries: 2 },
      );
      const list = Array.isArray(found) ? found : [];
      return list.sort(
        (a, b) => (a.createTime ?? a.startTime ?? 0) - (b.createTime ?? b.startTime ?? 0) || String(a.workflowId).localeCompare(String(b.workflowId)),
      );
    },

    async search(query, { size = 50 } = {}) {
      const found = await request(
        'GET',
        `/workflow/search?start=0&size=${size}&sort=${enc('startTime:DESC')}&query=${enc(query)}`,
        undefined,
        { retries: 1 },
      );
      return found?.results ?? [];
    },
  };
}

function normalizeBase(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

export function getApiBaseUrl() {
  const runtimeOverride =
    typeof window !== "undefined" && window.__CHAOS_CONFIG__?.apiBaseUrl
      ? normalizeBase(window.__CHAOS_CONFIG__.apiBaseUrl)
      : "";

  if (runtimeOverride) {
    return runtimeOverride;
  }

  const buildTimeUrl = normalizeBase(import.meta.env.VITE_API_BASE_URL);
  if (buildTimeUrl) {
    return buildTimeUrl;
  }

  // Default to relative same-origin API paths (e.g. http://localhost:3000/api/...)
  return "";
}

export function apiUrl(path) {
  const base = getApiBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

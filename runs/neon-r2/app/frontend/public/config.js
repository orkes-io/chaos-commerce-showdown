// Optional runtime configuration for static GitHub Pages deployments.
// Set apiBaseUrl to your deployed AWS Lambda API Gateway URL (no trailing slash)
// if you prefer runtime config over build-time VITE_API_BASE_URL.
// Leave empty ("") for local same-origin serving at http://localhost:3000.
window.__CHAOS_CONFIG__ = window.__CHAOS_CONFIG__ || {
  apiBaseUrl: "",
};

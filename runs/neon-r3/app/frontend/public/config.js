// Runtime configuration for GitHub Pages deployments.
// Leave apiBaseUrl empty ("") when served locally on http://localhost:3000.
// When deployed to GitHub Pages, set apiBaseUrl to your AWS Lambda API Gateway URL, e.g.:
//   window.__CHAOS_CONFIG__ = { apiBaseUrl: "https://abc123.execute-api.us-east-1.amazonaws.com" };
window.__CHAOS_CONFIG__ = window.__CHAOS_CONFIG__ || {
  apiBaseUrl: "",
};

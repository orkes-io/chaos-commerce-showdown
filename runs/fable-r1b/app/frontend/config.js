// Frontend configuration. This is the only file that differs between environments.
//
//   apiBaseUrl: where the Chaos Commerce backend lives, without a trailing slash.
//     ""  (default)  -> same origin, i.e. `npm start` serving both the store and /api on one port.
//     "https://abc123.execute-api.eu-west-1.amazonaws.com"  -> the AWS Lambda backend (GitHub Pages deploys).
//
// The GitHub Pages workflow overwrites this file from the CHAOS_API_BASE_URL repository variable.
window.CHAOS_CONFIG = {
  apiBaseUrl: "",
};

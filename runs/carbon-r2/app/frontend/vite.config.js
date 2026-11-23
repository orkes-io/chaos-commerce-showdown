import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// `base: './'` ensures built assets use relative paths so the exact same build
// works at root (`http://localhost:3000/`) AND on GitHub Pages subpaths
// (`https://<user>.github.io/<repo>/`).
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_DEV_API_PROXY || "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});

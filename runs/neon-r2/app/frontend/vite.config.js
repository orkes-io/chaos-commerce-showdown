import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// `base: "./"` ensures the built static bundle works cleanly on GitHub Pages
// whether served from a user site (/) or a project repo subpath (/<repo-name>/),
// as well as from http://localhost:3000 locally.
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});

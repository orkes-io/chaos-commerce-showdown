import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base (`./`) ensures static assets resolve on both http://localhost:3000
// and GitHub Pages subpaths (https://<user>.github.io/<repo>/).
export default defineConfig({
  base: process.env.VITE_BASE_PATH || './',
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});

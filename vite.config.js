import { defineConfig } from 'vite';

// GitHub Pages serves the site under /<repo-name>/, so the asset base must match.
// Override with VITE_BASE=/ for local preview or a custom domain.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/game/',
  build: {
    target: 'es2020',
    sourcemap: false,
  },
});

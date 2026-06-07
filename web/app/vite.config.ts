import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  // Relative base so the build works under any path (GitHub Pages project
  // sites, Cloudflare Pages, custom domain, etc.).
  base: "./",
  plugins: [react(), nodePolyfills({ globals: { Buffer: true, process: true } })],
  define: { "process.env.ANCHOR_BROWSER": "true" },
});

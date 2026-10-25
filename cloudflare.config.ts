import { bindings, defineConfig } from "cf/config";

export default defineConfig({
  worker: {
    name: "app-template",
    compatibilityDate: "2026-07-16",
    compatibilityFlags: ["nodejs_compat"],
    entrypoint: "./src/server.ts",
    assets: { htmlHandling: "none", notFoundHandling: "none", runWorkerFirst: ["/healthz", "/api/deploy.json"] },
    env: { ASSETS: bindings.assets() },
  },
});

import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { app } from "./src/app.ts";
import { buildInfo, themeColor } from "./tools/build-info.ts";
import { isStatic, staticSite } from "./tools/static-site.ts";

export default defineConfig(({ mode }) => {
  const stamp = buildInfo(mode === "cloudflare" ? "cloudflare" : "soliton");
  // soliton.static in .mk/app.json: prerender every page for the vhost to serve from dist/client.
  const prerender = mode === "soliton" && isStatic(fileURLToPath(new URL(".", import.meta.url)));
  return {
    define: {
      __DEPLOY_STAMP__: JSON.stringify(stamp),
      __VOID_COLOR__: JSON.stringify(themeColor("dark")),
      __PAPER_COLOR__: JSON.stringify(themeColor("light")),
    },
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    plugins: [
      ...(mode === "cloudflare"
        ? [
            cloudflare({
              viteEnvironment: { name: "ssr" },
              inspectorPort: false,
              experimental: { newConfig: { cfBuildOutput: true } },
            }),
          ]
        : []),
      tanstackStart(
        prerender ? { prerender: { enabled: true, filter: (page: { path: string }) => !page.path.includes("?") } } : {},
      ),
      react(),
      tailwindcss(),
      ...(prerender ? [staticSite({ stamp, csp: (app as { csp?: string }).csp })] : []),
    ],
  };
});

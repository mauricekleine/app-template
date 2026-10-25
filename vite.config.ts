import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { buildInfo, themeColor } from "./tools/build-info.ts";

export default defineConfig(({ mode }) => ({
  define: {
    __DEPLOY_STAMP__: JSON.stringify(buildInfo(mode === "cloudflare" ? "cloudflare" : "soliton")),
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
    tanstackStart(),
    react(),
    tailwindcss(),
  ],
}));

// iOS ignores SVG icons, so "Add to Home Screen" needs a PNG. Each build renders the app's mark to
// /apple-touch-icon.png, the path Safari also probes when a page declares no touch icon.
import { Resvg } from "@resvg/resvg-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type Plugin } from "vite";

export const touchIconPath = "/apple-touch-icon.png";

// Opaque, since iOS fills transparent pixels with black before it masks the corners.
export function renderTouchIcon(svg: string) {
  return new Resvg(svg, { background: "#ffffff", fitTo: { mode: "width", value: 180 } }).render().asPng();
}

export function touchIcon({ root, mark }: { root: string; mark: string }): Plugin {
  const render = () => renderTouchIcon(readFileSync(join(root, "public", mark), "utf8"));
  return {
    configureServer(server) {
      server.middlewares.use(touchIconPath, (_request, response) => {
        response.setHeader("content-type", "image/png");
        response.end(render());
      });
    },
    generateBundle() {
      if (this.environment.name !== "client") return;
      this.emitFile({ type: "asset", fileName: touchIconPath.slice(1), source: render() });
    },
    name: "app-template:touch-icon",
  };
}

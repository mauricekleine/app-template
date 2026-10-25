import handler, { createServerEntry } from "@tanstack/react-start/server-entry";

export default createServerEntry({
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/healthz") return Response.json({ status: "ok" }, { headers: { "cache-control": "no-store" } });
    if (path === "/api/deploy.json") {
      return Response.json(__DEPLOY_STAMP__, { headers: { "cache-control": "no-store" } });
    }
    return handler.fetch(request);
  },
});

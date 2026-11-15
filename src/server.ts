import handler, { createServerEntry } from "@tanstack/react-start/server-entry";

// A browser tags a cross-site write with Sec-Fetch-Site, or at least a foreign Origin; refuse both.
// Callers without these headers (curl, scripts, agents) pass: headers cannot authenticate a local process.
function crossSiteWrite(request: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return false;
  const site = request.headers.get("sec-fetch-site");
  if (site !== null) return site !== "same-origin" && site !== "none";
  const origin = request.headers.get("origin");
  if (origin === null) return false;
  return !URL.canParse(origin) || new URL(origin).host !== new URL(request.url).host;
}

export default createServerEntry({
  fetch(request) {
    if (crossSiteWrite(request)) return new Response("cross-site request refused", { status: 403 });
    const path = new URL(request.url).pathname;
    if (path === "/healthz") return Response.json({ status: "ok" }, { headers: { "cache-control": "no-store" } });
    if (path === "/api/deploy.json") {
      return Response.json(__DEPLOY_STAMP__, { headers: { "cache-control": "no-store" } });
    }
    return handler.fetch(request);
  },
});

import { resolve, sep } from "node:path";
import { runShutdown } from "./shutdown";

// Keep the adapter outside the Vite graph. The built Start app exposes one fetch.
const entry = new URL("../dist/server/server.js", import.meta.url).href;
const { default: start } = await import(entry);
const assets = resolve(import.meta.dir, "../dist/client");
const port = Number(process.env.PORT ?? 3000);

// Shutdown refuses new requests, waits for the ones in flight, then runs the app's hooks,
// so a write the app acknowledged is always one its flush hook sees.
let stopping = false;
let inflight = 0;
let drained: (() => void) | undefined;

const server = Bun.serve({
  hostname: "127.0.0.1",
  port,
  async fetch(request, server) {
    if (stopping)
      return new Response("shutting down", { status: 503, headers: { connection: "close", "retry-after": "1" } });
    const url = new URL(request.url);
    // Streams stay open until a hook closes them, so they never hold up the drain.
    if (url.pathname.startsWith("/api/streams/")) return handle(request, url, server);
    inflight += 1;
    try {
      return await handle(request, url, server);
    } finally {
      inflight -= 1;
      if (inflight === 0) drained?.();
    }
  },
});

async function handle(request: Request, url: URL, server: Bun.Server<undefined>): Promise<Response> {
  // App stream routes live under /api/streams/. Disable Bun's 10s idle close
  // before invoking Start, including time spent awaiting the first chunk.
  if (url.pathname.startsWith("/api/streams/")) server.timeout(request, 0);

  // Delivery checks always come from the server, even when a static build also wrote them to dist/client.
  const delivery = url.pathname === "/healthz" || url.pathname === "/api/deploy.json";
  if (!delivery && (request.method === "GET" || request.method === "HEAD")) {
    let pathname: string;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      return new Response("bad path", { status: 400 });
    }
    const filename = resolve(assets, `.${pathname}`);
    if (filename !== assets && !filename.startsWith(assets + sep)) return new Response("not found", { status: 404 });
    const file = Bun.file(filename);
    if (await file.exists()) {
      // Vite fingerprints /assets/; unversioned public files must revalidate.
      const immutable = /^\/assets\/.+-[\w-]{8,}\.[\w.]+$/.test(pathname);
      return new Response(request.method === "HEAD" ? null : file, {
        headers: {
          "content-type": file.type,
          "cache-control": immutable ? "public, max-age=31536000, immutable" : "no-cache",
        },
      });
    }
  }
  return start.fetch(request);
}

// The first signal drains requests and runs the app's shutdown hooks (src/shutdown.ts), then stops the listener.
// A second signal exits at once. The unit's TimeoutStopSec bounds a hook that never finishes.
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    if (stopping) process.exit(1);
    stopping = true;
    void server.stop();
    void new Promise<void>((done) => (inflight === 0 ? done() : (drained = done)))
      .then(runShutdown)
      .then(() => server.stop(true))
      .then(() => process.exit(0));
  });
}

// Announce readiness only once the handlers exist: tools/soliton-process.ts may signal as soon as it reads this line.
console.log(`app listening on ${server.url}`);

import { resolve, sep } from "node:path";

// Keep the adapter outside the Vite graph. The built Start app exposes one fetch.
const entry = new URL("../dist/server/server.js", import.meta.url).href;
const { default: start } = await import(entry);
const assets = resolve(import.meta.dir, "../dist/client");
const port = Number(process.env.PORT ?? 3000);

const server = Bun.serve({
  hostname: "127.0.0.1",
  port,
  async fetch(request, server) {
    const url = new URL(request.url);
    // App stream routes live under /api/streams/. Disable Bun's 10s idle close
    // before invoking Start, including time spent awaiting the first chunk.
    if (url.pathname.startsWith("/api/streams/")) server.timeout(request, 0);

    if (request.method === "GET" || request.method === "HEAD") {
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
  },
});
console.log(`app listening on ${server.url}`);

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    void server.stop(true).then(() => process.exit(0));
  });
}

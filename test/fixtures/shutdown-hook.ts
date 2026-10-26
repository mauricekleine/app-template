// Preloaded by test/shutdown.test.ts: a slow hook that records when it finished, and a
// slow GET /__slow that records when it started and finished, so the test can read their order.
import { appendFileSync } from "node:fs";
import { onShutdown } from "../../src/shutdown";

const marker = process.env.SHUTDOWN_MARKER!;

onShutdown(async () => {
  await Bun.sleep(300);
  appendFileSync(marker, "flushed\n");
});

// serve.ts checks the static file for every GET inside its own handler, so slowing that
// check keeps the request in flight exactly where the drain counts it.
const file = Bun.file.bind(Bun);
Bun.file = ((path: string, options?: BlobPropertyBag) => {
  const blob = file(path, options);
  if (typeof path !== "string" || !path.endsWith("/__slow")) return blob;
  return Object.assign(blob, {
    exists: async () => {
      appendFileSync(marker, "started\n");
      await Bun.sleep(400);
      appendFileSync(marker, "request\n");
      return false;
    },
  });
}) as typeof Bun.file;

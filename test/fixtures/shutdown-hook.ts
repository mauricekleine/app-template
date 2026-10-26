// Preloaded by test/shutdown.test.ts: a slow hook that records when it finished.
import { appendFileSync } from "node:fs";
import { onShutdown } from "../../src/shutdown";

onShutdown(async () => {
  await Bun.sleep(300);
  appendFileSync(process.env.SHUTDOWN_MARKER!, "flushed\n");
});

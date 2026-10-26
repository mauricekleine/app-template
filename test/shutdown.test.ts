import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startSoliton } from "../tools/soliton-process";

test("SIGTERM waits for the app's shutdown hooks before the server exits", async () => {
  const dir = await mkdtemp(join(tmpdir(), "shutdown-"));
  try {
    const marker = join(dir, "marker");
    const app = await startSoliton({ preload: "./test/fixtures/shutdown-hook.ts", env: { SHUTDOWN_MARKER: marker } });
    expect(await app.stop()).toBe(0);
    expect(await readFile(marker, "utf8")).toBe("flushed\n");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("a request in flight at SIGTERM finishes before the hooks run", async () => {
  const dir = await mkdtemp(join(tmpdir(), "shutdown-"));
  try {
    const marker = join(dir, "marker");
    const app = await startSoliton({ preload: "./test/fixtures/shutdown-hook.ts", env: { SHUTDOWN_MARKER: marker } });
    const slow = fetch(new URL("/__slow", app.url));
    // Signal only once the handler has the request; before that the drain has nothing to wait for.
    while (!(await Bun.file(marker).exists())) await Bun.sleep(10);
    const exited = app.stop();
    const response = await slow;
    // No such page: Start answers 404, which is still a complete response.
    expect(response.status).toBe(404);
    expect(await exited).toBe(0);
    expect(await readFile(marker, "utf8")).toBe("started\nrequest\nflushed\n");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("a request arriving while the hooks run is refused, so nothing is acknowledged after the flush", async () => {
  const dir = await mkdtemp(join(tmpdir(), "shutdown-"));
  try {
    const marker = join(dir, "marker");
    const app = await startSoliton({ preload: "./test/fixtures/shutdown-hook.ts", env: { SHUTDOWN_MARKER: marker } });
    expect((await fetch(new URL("/healthz", app.url))).status).toBe(200);
    const exited = app.stop();
    await Bun.sleep(100);
    // Over the kept-alive connection the drain answers 503; a new connection finds the listener closed.
    const late = await fetch(new URL("/healthz", app.url)).then(
      (response) => response.status,
      () => "refused",
    );
    expect(late === 503 || late === "refused").toBe(true);
    expect(await exited).toBe(0);
    expect(await readFile(marker, "utf8")).toBe("flushed\n");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("a second copy of the module shares the registry, as the built server bundle does", async () => {
  const first = await import("../src/shutdown");
  const second = await import(`../src/shutdown.ts?copy=${Date.now()}`);
  expect(second).not.toBe(first);
  const calls: string[] = [];
  const off = second.onShutdown(() => {
    calls.push("bundle hook");
  });
  try {
    await first.runShutdown();
    expect(calls).toEqual(["bundle hook"]);
  } finally {
    off();
  }
});

test("a failing hook is logged and the others still run", async () => {
  const { onShutdown, runShutdown } = await import("../src/shutdown");
  const calls: string[] = [];
  const offs = [
    onShutdown(() => {
      throw new Error("boom");
    }),
    onShutdown(async () => {
      calls.push("ran");
    }),
  ];
  const errors: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => errors.push(args);
  try {
    await runShutdown();
  } finally {
    console.error = original;
    for (const off of offs) off();
  }
  expect(calls).toEqual(["ran"]);
  expect(String(errors[0]?.[1])).toContain("boom");
});

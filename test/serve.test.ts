import { afterAll, beforeAll, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startSoliton } from "../tools/soliton-process";

let app: Awaited<ReturnType<typeof startSoliton>>;
beforeAll(async () => {
  app = await startSoliton();
});
afterAll(async () => {
  await app?.stop();
});

test("the production mount serves health and a complete, uncached deployment stamp", async () => {
  const health = await fetch(new URL("/healthz", app.url));
  expect(health.status).toBe(200);
  expect(await health.json()).toEqual({ status: "ok" });
  const response = await fetch(new URL("/api/deploy.json", app.url));
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toEqual({
    sha: expect.stringMatching(/^[0-9a-f]{40}$/),
    framework: "tanstack-start",
    superthread_version: expect.stringMatching(/^2\./),
    template_version: "1.0.0",
    target: "soliton",
  });
});

test("Start renders the first page and an unknown path returns a real HTML 404", async () => {
  const home = await fetch(app.url);
  expect(home.status).toBe(200);
  const html = await home.text();
  expect(html).toContain('data-mk="fleet-rail"');
  expect(html).toContain("<h1");
  const lost = await fetch(new URL("/this-page-does-not-exist", app.url));
  expect(lost.status).toBe(404);
  expect(lost.headers.get("content-type")).toContain("text/html");
  expect(await lost.text()).toContain('href="/"');
});

test("fingerprinted assets are immutable and public files revalidate", async () => {
  const html = await (await fetch(app.url)).text();
  const asset = html.match(/(?:src|href)="(\/assets\/[^"?]+\.js)"/)?.[1];
  expect(asset).toBeDefined();
  const response = await fetch(new URL(asset!, app.url));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
  expect((await response.text()).length).toBeGreaterThan(100);
  const mark = await fetch(new URL("/mark.svg", app.url), { method: "HEAD" });
  expect(mark.status).toBe(200);
  expect(mark.headers.get("cache-control")).toBe("no-cache");
  expect(mark.headers.get("content-type")).toContain("image/svg+xml");
  expect(await mark.text()).toBe("");
  expect((await fetch(new URL("/assets/missing-12345678.js", app.url))).status).toBe(404);
});

test("the deploy verifier accepts only the requested SHA and fails on a stale build", async () => {
  const { sha } = (await (await fetch(new URL("/api/deploy.json", app.url))).json()) as { sha: string };
  const verify = async (expected: string) => {
    const child = Bun.spawn(["bun", "tools/deploy-verify.ts", expected], {
      env: { ...process.env, DEPLOY_URL: app.url, DEPLOY_VERIFY_TIMEOUT: "1" },
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, code] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    return { stdout, stderr, code };
  };
  const accepted = await verify(sha);
  expect(accepted.code).toBe(0);
  expect(accepted.stdout).toContain(`verified ${sha}`);
  const stale = await verify(sha === "0".repeat(40) ? "1".repeat(40) : "0".repeat(40));
  expect(stale.code).toBe(1);
  expect(stale.stderr).toContain(`observed SHA ${sha}`);
});

test("without DEPLOY_URL the verifier checks the app's own fleet address", async () => {
  const { DEPLOY_URL: _, ...env } = process.env;
  const tool = new URL("../tools/deploy-verify.ts", import.meta.url).pathname;
  const verify = async (stamp?: object) => {
    const cwd = mkdtempSync(join(tmpdir(), "deploy-verify-"));
    try {
      if (stamp) await Bun.write(join(cwd, ".mk/app.json"), JSON.stringify(stamp));
      const child = Bun.spawn(["bun", tool, "0".repeat(40)], {
        cwd,
        env: { ...env, DEPLOY_VERIFY_TIMEOUT: "1" },
        stderr: "pipe",
      });
      const [stderr, code] = await Promise.all([new Response(child.stderr).text(), child.exited]);
      return { stderr, code };
    } finally {
      rmSync(cwd, { force: true, recursive: true });
    }
  };
  const named = await verify({ name: "deploy-verify-probe", template_sha: "a".repeat(40), target: "soliton" });
  expect(named.code).toBe(1);
  expect(named.stderr).toContain("waiting for https://deploy-verify-probe.mauricekleine.com/api/deploy.json");
  // No stamp, a path-like name, a malformed template_sha and the template's own unstamped checkout all need
  // DEPLOY_URL. The template stamp is written out, not read from .mk/app.json: in a synced app that file is the
  // app's stamped one.
  for (const stamp of [
    undefined,
    { name: "../elsewhere", template_sha: "a".repeat(40) },
    { name: "deploy-verify-probe", template_sha: "oops" },
    { template: "mauricekleine/app-template", template_sha: null, target: "soliton", name: "app-template" },
  ]) {
    const unnamed = await verify(stamp);
    expect(unnamed.code).toBe(1);
    expect(unnamed.stderr).toContain("set DEPLOY_URL");
  }
});

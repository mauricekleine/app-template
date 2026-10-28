import { expect, test } from "bun:test";
import { chmod, copyFile, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Runs a copy of the deploy command in a scratch app. A fake pinned cf is always on PATH, as `bun run` puts
// node_modules/.bin there; `wrapper` also installs a fake login wrapper in ~/.local/bin, as on Maurice's hosts.
async function deploy(target: string, wrapper: boolean) {
  // realpath: macOS reports the temporary directory under /private, as cf sees it in $PWD.
  const dir = await realpath(await mkdtemp(join(tmpdir(), "cloudflare-deploy-")));
  try {
    const app = join(dir, "app");
    const calls = join(dir, "calls");
    await mkdir(join(app, "tools"), { recursive: true });
    await mkdir(join(app, ".mk"));
    await copyFile(new URL("../tools/cloudflare-deploy.ts", import.meta.url), join(app, "tools/cloudflare-deploy.ts"));
    await writeFile(join(app, ".mk/app.json"), JSON.stringify({ name: "demo", target }));
    for (const [name, bin] of [
      ["pinned", join(dir, "bin")],
      ...(wrapper ? [["wrapper", join(dir, "home/.local/bin")]] : []),
    ]) {
      await mkdir(bin, { recursive: true });
      await writeFile(join(bin, "cf"), `#!/bin/sh\nprintf '${name} %s %s\\n' "$PWD" "$*" >> "${calls}"\n`);
      await chmod(join(bin, "cf"), 0o755);
    }
    const run = Bun.spawnSync([process.execPath, "tools/cloudflare-deploy.ts", "--dry-run"], {
      cwd: app,
      env: { HOME: join(dir, "home"), PATH: `${join(dir, "bin")}:/usr/bin:/bin` },
    });
    const called = await readFile(calls, "utf8").catch(() => "");
    return { code: run.exitCode, stderr: run.stderr.toString(), called: called.replaceAll(app, "<app>") };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("a soliton app refuses to publish a Worker and never runs cf", async () => {
  const result = await deploy("soliton", true);
  expect(result.code).toBe(1);
  expect(result.stderr).toContain("infra/soliton/deploy.sh");
  expect(result.called).toBe("");
});

test("a cloudflare app deploys its prebuilt output through the login wrapper, or the pinned cf without one", async () => {
  expect(await deploy("cloudflare", true)).toEqual({
    code: 0,
    stderr: "",
    called: "wrapper <app> deploy --prebuilt --dry-run\n",
  });
  expect(await deploy("cloudflare", false)).toEqual({
    code: 0,
    stderr: "",
    called: "pinned <app> deploy --prebuilt --dry-run\n",
  });
});

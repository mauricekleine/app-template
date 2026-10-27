// `bun run deploy`: publishes the prebuilt Cloudflare output, but only for an app whose .mk/app.json targets
// Cloudflare. A Soliton app deploys with infra/soliton/deploy.sh, and publishing it as a Worker would put a
// stray copy online. ~/.local/bin comes first so an installed cf login wrapper selects the account; Workers
// Builds has no wrapper and runs the project's pinned cf from node_modules/.bin, which `bun run` puts on PATH.
import { readFileSync } from "node:fs";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const app = JSON.parse(readFileSync(join(root, ".mk/app.json"), "utf8")) as { name?: string; target?: string };
if (app.target !== "cloudflare") {
  console.error(
    `deploy: ${app.name ?? "this app"} targets ${app.target ?? "no host"}, not cloudflare, so it publishes no Worker. ` +
      "a soliton app deploys with bash infra/soliton/deploy.sh <commit>.",
  );
  process.exit(1);
}
const PATH = [process.env.HOME && join(process.env.HOME, ".local/bin"), process.env.PATH]
  .filter(Boolean)
  .join(delimiter);
const cf = Bun.which("cf", { PATH });
if (!cf) {
  console.error("deploy: cf is not installed; run bun install first");
  process.exit(1);
}
const child = Bun.spawnSync([cf, "deploy", "--prebuilt", ...process.argv.slice(2)], {
  cwd: root,
  env: { ...process.env, PATH },
  stdio: ["inherit", "inherit", "inherit"],
});
process.exit(child.exitCode ?? 1);

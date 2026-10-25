import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
export const theme = readFileSync(new URL("src/components/superthread/styles/superthread.css", root), "utf8");

export function buildInfo(target: "soliton" | "cloudflare") {
  const sha =
    process.env.WORKERS_CI_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error("build commit must be a full SHA");
  const superthread = theme.match(/@mk\/tokens ([^\s*]+)/)?.[1];
  if (!superthread) throw new Error("installed @mk/tokens has no version stamp");
  const manifest = JSON.parse(readFileSync(new URL("template.json", root), "utf8")) as { version: string };
  return {
    sha,
    framework: "tanstack-start",
    superthread_version: superthread,
    template_version: manifest.version,
    target,
  };
}

// The browser chrome uses the same ink as the installed theme, not a copied colour.
export function themeColor(mode: "light" | "dark") {
  const block = mode === "dark" ? theme.split(".dark {")[1] : theme.split(":root")[1];
  const value = block?.match(/--background:\s*([^;]+);/)?.[1];
  if (!value) throw new Error(`missing ${mode} background token`);
  return value;
}

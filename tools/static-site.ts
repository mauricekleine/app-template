// Static Soliton apps: Start prerenders the pages into dist/client and the vhost serves that directory.
// Opt in with soliton.static in .mk/app.json; README "Static on Soliton" has the contract.
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Plugin } from "vite";

export function isStatic(root: string) {
  let stamp: { target?: string; soliton?: { static?: boolean } };
  try {
    stamp = JSON.parse(readFileSync(join(root, ".mk/app.json"), "utf8"));
  } catch {
    return false;
  }
  return stamp.target === "soliton" && stamp.soliton?.static === true;
}

// Runs after Start's prerender, which is itself a post buildApp hook registered earlier in the plugin list.
export function staticSite({ stamp, csp }: { stamp: unknown; csp?: string }): Plugin {
  return {
    name: "app-template:static-site",
    enforce: "post",
    buildApp: {
      order: "post",
      async handler(builder) {
        const client = builder.environments.client;
        if (!client) throw new Error("static build needs the client environment");
        const output = resolve(client.config.root, client.config.build.outDir);
        await mkdir(join(output, "api"), { recursive: true });
        await writeFile(join(output, "api/deploy.json"), `${JSON.stringify(stamp)}\n`);
        const pages = (await readdir(output, { recursive: true })).filter((file) => file.endsWith(".html"));
        if (!pages.length) throw new Error("static build prerendered no pages");
        if (!csp) return;
        for (const page of pages) {
          const file = join(output, page);
          await writeFile(file, withPolicy(await readFile(file, "utf8"), csp));
        }
      },
    },
  };
}

const sha256 = (text: string) => `'sha256-${createHash("sha256").update(text, "utf8").digest("base64")}'`;
const entities: Record<string, string> = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">" };
const decode = (value: string) =>
  value.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (whole, name: string) =>
    name[0] === "#"
      ? String.fromCodePoint(Number.parseInt(name.slice(name[1] === "x" ? 2 : 1), name[1] === "x" ? 16 : 10))
      : (entities[name] ?? whole),
  );

// A prerendered page's inline scripts, style elements and style attributes are fixed at build time, so the
// policy can name each by hash instead of allowing inline code. The meta tag goes first in <head>, before
// anything it governs. Browsers hash script and style text as written, and attribute values after entity decoding.
export function withPolicy(html: string, csp: string) {
  if (/http-equiv=["']?content-security-policy/i.test(html)) throw new Error("page already declares a policy");
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([, attributes]) => !/\ssrc=/i.test(` ${attributes}`))
    .map(([, , body]) => sha256(body ?? ""));
  const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(([, body]) => sha256(body ?? ""));
  const attributes = [...html.matchAll(/\sstyle="([^"]*)"/gi)].map(([, value]) => sha256(decode(value ?? "")));

  const directives = new Map<string, string[]>();
  for (const directive of csp.split(";")) {
    const [name, ...values] = directive.trim().split(/\s+/);
    if (name) directives.set(name.toLowerCase(), values);
  }
  // An -elem or -attr directive overrides its general one for that kind of code, so every declared one gets the hashes.
  const extend = (names: string[], hashes: string[], prefix: string[] = []) => {
    if (!hashes.length) return;
    const declared = names.filter((name) => directives.has(name));
    if (!declared.length) throw new Error(`the policy needs a ${names.at(-1)} directive for this page's inline code`);
    for (const name of declared) {
      const values = directives.get(name) ?? [];
      directives.set(name, [...new Set([...values.filter((value) => value !== "'none'"), ...prefix, ...hashes])]);
    }
  };
  extend(["script-src-elem", "script-src"], scripts);
  extend(["style-src-elem", "style-src"], styles);
  if (attributes.length && !directives.has("style-src-attr")) directives.set("style-src-attr", []);
  extend(["style-src-attr"], attributes, ["'unsafe-hashes'"]);

  const policy = [...directives].map(([name, values]) => [name, ...values].join(" ")).join("; ");
  if (/["<>&]/.test(policy)) throw new Error("the policy must not contain quotes, angle brackets or ampersands");
  const head = html.match(/<head\b[^>]*>/i);
  if (!head || head.index === undefined) throw new Error("page has no <head>");
  const at = head.index + head[0].length;
  return `${html.slice(0, at)}<meta http-equiv="Content-Security-Policy" content="${policy}"/>${html.slice(at)}`;
}

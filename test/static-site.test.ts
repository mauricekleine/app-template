import { expect, test } from "bun:test";
import { withPolicy } from "../tools/static-site";

// Hashes a browser computes for these exact inputs (openssl dgst -sha256 -binary | base64 over the decoded text).
const theme = "document.documentElement.className='dark'";
const themeHash = "'sha256-VTlFXC39VvmSZF4cjI0yoQ99j0fJhr+/G4kjQc1jHOk='";
const widthHash = "'sha256-BtuzJzaA5CpAOLtbxycJNQTl6jVl00aZrrqjOdYoN04='";

test("a prerendered page's policy goes first in head and names each inline script and style attribute", () => {
  const page = `<!DOCTYPE html><html><head><title>x</title><script>${theme}</script><script type="module" src="/assets/a.js"></script></head><body><div style="--w:1rem;font-family:&quot;a&quot;"></div><script>${theme}</script></body></html>`;
  const html = withPolicy(page, "default-src 'none'; script-src 'self'; style-src 'self'");
  const policy = html.match(
    /^<!DOCTYPE html><html><head><meta http-equiv="Content-Security-Policy" content="([^"]+)"\/><title>/,
  )?.[1];
  expect(policy).toBe(
    `default-src 'none'; script-src 'self' ${themeHash}; style-src 'self'; style-src-attr 'unsafe-hashes' ${widthHash}`,
  );
  expect(html.replace(/<meta http-equiv[^>]+>/, "")).toBe(page);
});

test("element directives, which override script-src and style-src, get the hashes too", () => {
  const page = `<html><head><script>${theme}</script><style>${theme}</style></head></html>`;
  const policy = withPolicy(page, "script-src 'self'; script-src-elem 'self'; style-src-elem 'none'").match(
    /content="([^"]+)"/,
  )?.[1];
  expect(policy).toBe(
    `script-src 'self' ${themeHash}; script-src-elem 'self' ${themeHash}; style-src-elem ${themeHash}`,
  );
});

test("a policy that cannot cover the page's inline code fails the build", () => {
  expect(() => withPolicy(`<html><head><script>${theme}</script></head></html>`, "default-src 'self'")).toThrow(
    "script-src",
  );
  expect(() => withPolicy("<html><body></body></html>", "script-src 'self'")).toThrow("<head>");
  expect(() =>
    withPolicy(
      '<html><head><meta http-equiv="Content-Security-Policy" content="x"></head></html>',
      "script-src 'self'",
    ),
  ).toThrow("already declares");
});

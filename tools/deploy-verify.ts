const sha = process.argv[2];
const timeout = Number(process.env.DEPLOY_VERIFY_TIMEOUT ?? 1200);

// Fleet apps live at <name>.mauricekleine.com; DEPLOY_URL overrides it, for loopback or another host.
// Only a stamped app has that address: the template's own stamp has no template_sha and no live host.
async function deployUrl() {
  if (process.env.DEPLOY_URL) return process.env.DEPLOY_URL;
  const file = Bun.file(".mk/app.json");
  const stamp = (await file.exists()) ? ((await file.json()) as { name?: unknown; template_sha?: unknown }) : {};
  if (
    typeof stamp.template_sha !== "string" ||
    !/^[0-9a-f]{40}$/.test(stamp.template_sha) ||
    typeof stamp.name !== "string" ||
    !/^[a-z0-9][a-z0-9-]*$/.test(stamp.name)
  )
    throw new Error("set DEPLOY_URL, or run from a stamped app checkout whose .mk/app.json names the app");
  return `https://${stamp.name}.mauricekleine.com`;
}

try {
  if (process.argv.length !== 3 || !/^[0-9a-f]{40}$/.test(sha ?? ""))
    throw new Error("expected one full 40-character commit SHA");
  const url = new URL("/api/deploy.json", await deployUrl());
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("DEPLOY_URL must use http or https");
  if (!Number.isSafeInteger(timeout) || timeout < 1) throw new Error("DEPLOY_VERIFY_TIMEOUT must be positive seconds");
  const deadline = Date.now() + timeout * 1000;
  let observed = "no response";
  do {
    try {
      url.searchParams.set("verify", String(Date.now()));
      const response = await fetch(url, {
        headers: { "cache-control": "no-cache" },
        signal: AbortSignal.timeout(Math.min(10_000, Math.max(1, deadline - Date.now()))),
      });
      if (response.ok) {
        const stamp = (await response.json()) as { sha?: string };
        if (stamp.sha === sha) {
          console.log(`verified ${sha}`);
          process.exit(0);
        }
        observed = `observed SHA ${stamp.sha ?? "missing"}`;
      } else observed = `HTTP ${response.status}`;
    } catch (error) {
      observed = error instanceof Error ? error.message : String(error);
    }
    if (Date.now() >= deadline) break;
    await Bun.sleep(Math.min(5_000, deadline - Date.now()));
  } while (Date.now() < deadline);
  throw new Error(`timed out after ${timeout}s waiting for ${url.origin}${url.pathname}; ${observed}`);
} catch (error) {
  console.error(`deploy:verify: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
export {};

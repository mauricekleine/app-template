# app-template

A running TanStack Start app for Maurice's fleet. Bun, React, Tailwind and superthread v2, with Soliton and Cloudflare targets from the same source. Public, MIT, and a GitHub template.

## Run it

Use Bun 1.4.4. Tooling that needs Node uses 24.22.1 (`.node-version`).

```sh
bun install --frozen-lockfile
bun run dev                         # 127.0.0.1:3000
bun run build                       # both targets, then bun --check for each
bun run test                        # HTTP tests against the built Soliton app
PORT=3000 bun run start              # production Soliton server
```

The first page and the unknown-route page are real Start renders. Void is the initial mode on every full load; the paper-mode control switches the current document, including browser chrome. There is no saved preference or theme hydration script. No TanStack devtools ship in the app.

`src/app.ts`, `public/mark.svg`, `src/routes/`, `src/page.css`, PRODUCT.md and DESIGN.md are the starting places for app-specific work. The neutral square-plus mark is a placeholder: `mk apps create` will replace `public/mark.svg` and the identity in `src/app.ts`. The masthead and favicon use that same mark. Fill in the product and design stubs before growing the example page.

## Superthread

`components.json` maps `@mk` directly to the immutable `2.2.0` snapshot at `https://superthread.mauricekleine.com/r/v/2.2.0/{name}.json`. The installed tokens, fleet rail, button and badge (including their dependency closure) came from that snapshot through shadcn 4.22.1. Their source and retained version stamps live under `src/components/superthread/`. The app imports the installed CSS; it does not reproduce the theme.

```sh
bun --bun shadcn add @mk/button --yes --overwrite
bun run registry:install             # explicit live-registry canary
bun run registry:install --snapshot  # reinstall the manifest snapshot
```

The install helper selects the live mapping by default, or the manifest snapshot with `--snapshot`. It reinstalls `template.json`'s items, restores the snapshot mapping and existing dependency pins, and retains new registry dependencies. It then refreshes the lock. The scheduled canary runs this in a disposable checkout; it does not commit or publish anything. After a successful canary, a template upgrade deliberately updates the snapshot, manifest and installed items together.

The rail links each fleet ship to the public url in superthread's fleet data, and its home mark to superthread; soliton has no url and stays disabled. An app passes `hrefs` only to change a link: `"/"` for its own ship once it joins the fleet, `null` to unlink a cell. Fonts and rail marks come from the public superthread host. Unbounded and Fragment Mono load for everyone. Supreme and Erode are restricted to Maurice's origins and localhost; other origins use the theme's system fallbacks. See the [registry documentation](https://superthread.mauricekleine.com/install).

## Two targets

`bun run build:soliton` writes `dist/client/` and the Start fetch entry in `dist/server/server.js`. `src/serve.ts` mounts that fetch inside `Bun.serve` on `127.0.0.1:$PORT`, default 3000. Keep the runtime dependencies beside `dist/`; the server bundle has external packages. Static files come from `dist/client/`. Vite's fingerprinted `/assets/` files cache for a year, immutable; public files revalidate. Missing assets and unknown pages pass to Start and return a real 404.

Streaming routes belong under `/api/streams/`. The mount calls `server.timeout(request, 0)` before passing each such request to Start, so Bun's default ten-second idle timeout cannot close a quiet stream or a request waiting for its first event. When adding a stream at another path, add that path to the mount's timeout rule. On SIGTERM or SIGINT the server stops taking connections, answers further requests with 503 and waits for those in flight (streams excepted), then runs the app's shutdown hooks, then closes and exits; a second signal exits at once. Register work that must finish before exit, such as flushing pending writes or closing open streams, with `onShutdown` from `src/shutdown.ts`. Hooks run together and the server waits for all of them, so the unit's `TimeoutStopSec` must cover the slowest; a hook that throws is logged and the others still run.

On Soliton an app deploys with `bash infra/soliton/deploy.sh <commit>`, and `--rollback` swaps back to the previous release. It reads the app's name and ports from `.mk/app.json` and runs Soliton's release command ([runbook](https://github.com/mauricekleine/soliton/blob/main/docs/runbooks/start-on-bun.md)): build the commit into its own release, smoke-test it on the spare port, switch `current`, restart the user unit and check the SHA. Only `current` and `previous` are kept. You rarely run it by hand: Soliton's `mk-apps-deploy.timer` runs `mk apps deploy --all` every two minutes, which deploys `origin/main` whenever it differs from the live release and backs off a commit that fails. `infra/soliton/app.service` and `infra/soliton/Caddyfile` are install-time templates: replace `APP_NAME`, `PORT_NUMBER` and `APP_HOST`, install the unit once as a user unit, and copy the `reverse_proxy` block into the app's vhost in soliton, which owns access control. A migration keeps its app's existing unit name, port and vhost. [docs/migrating.md](docs/migrating.md) has the steps for moving an existing app onto the template.

`bun run build:cloudflare` writes cf's prebuilt output to `.cloudflare/output/v0/`, independently of `dist/`. `cloudflare.config.ts` names the Worker, Start entry and asset behavior. Personalize it before arranging hosting. Neither build deploys. `bun run deploy` deploys the prebuilt output of an app whose `.mk/app.json` says `target: cloudflare`, and refuses anywhere else, so a Soliton app never publishes a stray Worker. It puts `~/.local/bin` first so an installed cf login wrapper selects the account; Workers Builds has no wrapper and uses the project's pinned cf. A Cloudflare app deploys on every push to `main` through a Workers Builds trigger (build `bun install --frozen-lockfile && bun run build:cloudflare`, deploy `bun run deploy`), which `mk apps deploy --setup <name>` creates once from the M5. This repository has no deploy workflow or configured live hostname. The Worker's `/healthz` and `/api/deploy.json` run through the same server entry as Soliton.

Both targets build in CI regardless of the app's chosen `.mk/app.json` target.

### Static on Soliton

An app with no server work can skip the process. Set `"static": true` in `.mk/app.json`'s `soliton` block, with a `smoke_port` and no `port`. `build:soliton` then prerenders every page Start reaches from `/` (links with a query string are skipped) into `dist/client/`, and writes the build stamp to `dist/client/api/deploy.json`. `deploy.sh` passes `--static` to the release command: it builds and smoke-tests the release as usual, checks the prerendered page and stamp, and switches `current` without a unit. The app's vhost in soliton serves `~/.local/share/start-app/<name>/current/dist/client` with `file_server`, so the switch takes effect on the next request and `--rollback` is the same swap back. `src/serve.ts` still answers `/healthz` and `/api/deploy.json` itself, so the HTTP tests and the smoke run see the same delivery checks as a process app.

A static page has no server to send headers, so its content security policy travels in the page. Set it as a `csp` string on the `app` object in `src/app.ts` (keep that file plain data, since `vite.config.ts` imports it). The build writes it as the first element of each prerendered page's `<head>`, adding the sha256 hash of every inline script to `script-src` and `script-src-elem`, of every inline style element to `style-src` and `style-src-elem`, and of every `style` attribute to `style-src-attr` with `'unsafe-hashes'`. It extends whichever of each pair the policy declares. Start's hydration scripts and an app's theme script are fixed at build time, so the policy allows exactly them and no other inline code. A policy without the directive a page needs fails the build. `tools/static-site.ts` holds this step and `test/static-site.test.ts` checks the hashes against openssl's.

## Delivery checks

`/healthz` responds with `{"status":"ok"}`. `/api/deploy.json` is compiled into each build with:

```json
{
  "sha": "<40-character build commit>",
  "framework": "tanstack-start",
  "superthread_version": "2.2.0",
  "template_version": "1.0.0",
  "target": "soliton"
}
```

The SHA comes from `WORKERS_CI_COMMIT_SHA`, then `GITHUB_SHA`, then git HEAD. Registry version comes from the installed tokens' stamp; template version comes from `template.json`. The target records the actual build, and neither delivery endpoint is cached.

```sh
bun run deploy:verify <full-sha>
```

In an app made from this template it checks `https://<name>.mauricekleine.com`, with the name from the stamped `.mk/app.json`. An app hosted elsewhere records its https address as the stamp's `url` (seds: `"url": "https://sedsngo.org"`); `DEPLOY_URL` overrides both. This template's own checkout has no live host (its stamp has no `template_sha`), so here it needs `DEPLOY_URL`, for example `DEPLOY_URL=http://127.0.0.1:3000 bun run deploy:verify <full-sha>`. The verifier polls `/api/deploy.json` with cache bypass until the SHA matches exactly. It exits 0 on a match, 1 on invalid configuration or timeout. `DEPLOY_VERIFY_TIMEOUT` is seconds, default 1200. A newer SHA does not silently count as the requested build. Point it at loopback to check a local build.

## Sync contract, version 1

`template.json` is the template manifest, copied into each app. `.mk/app.json` is app-owned state. `mk apps create` and `mk apps sync` (dotfiles `mk apps`) consume them.

The manifest has `schema_version`, `version`, an explicit `files` array, `package_json.owned_keys` and `registry` (`version`, `url`, `items`). Every listed path is relative to the repository root, with no globs. Registry transitive files are listed too. Files outside this list belong to the app. Git file modes travel with owned files. App-specific routes, the root document, identity, styles, mark and product/design docs are intentionally app-owned. `src/routeTree.gen.ts` and `bun.lock` are derived artifacts: regenerate the route tree through Vite and the lock through Bun after a sync, rather than treating them as owned text.

`package_json.owned_keys` is a list of RFC 6901 JSON pointers, each owning one leaf. For example `/dependencies/@tanstack~1react-start` names the Start pin; it does not own the rest of `dependencies`. Shared scripts and shared dependency pins are listed individually. Package name, app version, app scripts and app dependencies outside these pointers belong to the app. Removing a pointer in a future manifest is an owned deletion, subject to the same three-way conflict rule as a removed file.

The app stamp is:

```json
{
  "template": "mauricekleine/app-template",
  "template_sha": null,
  "target": "soliton",
  "name": "app-template",
  "soliton": { "port": 3000, "smoke_port": 3001 }
}
```

In this source template only, `template_sha: null` means "this checkout is the template itself". A source cannot embed its own future commit hash. Creation must replace it with the full template commit used to create the app. In an app it is a required full 40-character SHA: the last successfully applied template revision, never the app's HEAD or its deploy SHA. `target` is `soliton` or `cloudflare`; `name` is the app's name. `soliton` holds the live and smoke ports for the Soliton target; Cloudflare apps omit it. Optional `url` is the app's https address when it doesn't live at `<name>.mauricekleine.com`. Creation sets all of these, and sync preserves them.

An app that adopts the template in place around a runtime of its own records what it doesn't carry in the stamp, beside the fields above:

```json
{
  "opt_out": {
    "files": ["AGENTS.md", "src/", "tools/"],
    "package_json": ["/scripts/", "/devDependencies/husky"]
  },
  "checks": ["bun install", "bun run verify", "bun run build"]
}
```

`opt_out.files` names owned paths; an entry ending in `/` covers every owned path under it, including paths a later manifest adds. `opt_out.package_json` names owned pointers the same way: `/scripts/` covers every owned script. Sync never treats an opted-out path or key as a candidate: it doesn't write, merge or delete it, and it leaves the `@mk` mapping alone when `components.json` is opted out. `checks` replaces sync's default validation with the app's own gate, each entry a command run from the app root in order. An opt-out only narrows the boundary the template's manifests draw. Orbit's `.mk/app.json` is the worked example.

For a sync from base `template_sha` to a selected template commit:

1. Read both template manifests at those commits. Their union, minus the app's opt-outs, defines the files and package leaves to consider, including additions and deletions. An unowned or opted-out file or package key is never a sync candidate.
2. Three-way merge each candidate using the old template content as base, the current app as ours, and the new template as theirs. A locally edited owned file is a real merge input, not permission to overwrite it. Remove a formerly owned file/key only when the merge is clean; leave the conflict for an agent otherwise. After that one transition, a path removed from ownership belongs to the app.
3. Update the registry snapshot mapping and items using the incoming manifest. Review and merge registry source like other owned files. `src/styles.css` remains app-owned: preserve its imports of the installed theme, Tailwind, tw-animate-css and shadcn's Tailwind CSS.
4. Regenerate the lock and route tree, build both targets and run the checks (the stamp's `checks` when it names them). Update `.mk/app.json.template_sha` to the incoming full commit only after the sync is complete. A clean sync opens a normal PR; a conflict needs an agent. Neither is a deployment.

The build stamp's `template_version` is the manifest's release version; `template_sha` is the exact sync base. They serve different purposes. The manifest itself is owned so the installed contract advances with a sync. A synchronizer must read the template's manifests, not trust an app's edited ownership list to expand the boundary.

## Checks and automation

```sh
bun fmt --check
bun run typecheck
bun run build
bun run test
bunx playwright install --with-deps chromium
bun run test:a11y
```

On Soliton, wrap blocking commands in `~/.local/bin/hyperspeed-run --`. The HTTP tests start the real production server on an ephemeral loopback port and stop only their own process. They cover health, build identity, page and 404 rendering, cache policy, and the verifier's exact-match and stale-build outcomes. The browser check runs axe on the first page in void and paper, failing on violations and unresolved contrast findings. It checks mobile 404 recovery and browser diagnostics too. Chromium's expected network console message for the unknown document's HTTP 404 is the only allowed diagnostic; missing assets, JavaScript errors and hydration warnings still fail.

`.github/workflows/ci.yml` runs only on GitHub-hosted Ubuntu. Its required check name is **`template-ci`**. Apps can opt into an additional browser suite by defining the app-owned `test:browser` script (for example, `"test:browser": "bun run test:library"`); CI runs it after Chromium is installed and the shared accessibility check passes. The template does not own that package key. `.github/workflows/registry-canary.yml` runs daily at **05:17 UTC** and on manual dispatch, reinstalling live `@mk` items before building and testing both targets and running the same browser check. Its check name is **`registry-canary`**. A failed scheduled job is a visible failed Actions run; GitHub's workflow notification settings deliver it to subscribers.

The pre-commit hook formats staged files with pinned Bun and lints them with bun-canary when available. Registry files have separate formatter and linter ignores so their provenance stays intact. `taze.config.ts` reads Bun's three-day minimum release age from `bunfig.toml`.

`mk apps create`/`sync`, a secret-bearing `.env.tpl`/`op run` variant, packaging CI/deploy/serve as registry items, and Soliton release/rollback tooling are outside v1.

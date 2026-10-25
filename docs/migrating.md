# Migrating an app onto app-template

How an app that already runs on Soliton moves onto this template without changing its address. Constellation moved first (mauricekleine/constellation#1), then quanta (mauricekleine/quanta#1), which added a SQLite database, binary content and a project skill. Artifacts moved as a static app that Caddy serves beside content it already served (mauricekleine/artifacts#1); see [Static apps](#static-apps). Trisys follows the same steps. Orbit keeps its repository, so it skips step 1 and adopts the template in place.

## 1. Create the repository

```sh
mk apps create <name> --target soliton --port <live port>
```

`--port` keeps the live port, unit name, vhost and fleet ship. Create picks a free smoke port, prepends it as a comment to the existing vhost and copies the ship's mark. It opens two PRs:

- **The app PR.** Mark it draft at once (`gh pr ready <n> --undo`): it holds only the template's starter page until the port lands.
- **The soliton PR.** Create adds the repository to `infra/hyperspeed-ci/runner-repositories.json`, the one runner inventory every runner script reads. It is not a held host input, so the App merges it. Then run `bash infra/hyperspeed-ci/add-repo-runners.sh mauricekleine/<name>` on Soliton, which also stages the inventory and helpers on the CI guest, and confirm both runners are online in the repository's Actions settings. Until then the app PR's `template-ci` stays queued.

If an older repository already has the name, rename it first (quanta's became `quanta-archive`). GitHub keeps answering the old name with a redirect; create treats a redirect as a free name. If the live app keeps state under `~/projects/<name>`, run create with `MK_APPS_ROOT` pointing at another directory, so its bootstrap worktree doesn't collide with the live data. The checkout moves into place at cut-over.

To adopt the template in place instead, see [Adopting in place](#adopting-in-place).

### Adopting in place

Orbit kept its repository, runtime and deploy path (mauricekleine/orbit#28). Copy the owned files that fit the app from `template.json` at one template commit, write `.mk/app.json` with that `template_sha`, and check with `mk apps sync --check <path>`.

- **Opt-outs.** Record every owned path and package key the app doesn't carry in the stamp's `opt_out`, and name the app's own gate in `checks` (README, "Sync contract"). Opt out of directories with a trailing `/` (`src/`, `tools/`, `test/`): the template adds files there, and a new owned file would otherwise land in the app.
- **`.gitignore`.** Keep the template's lines first and the app's own below a `# <name>` line, so template edits merge three-way.
- **Formatter and linter.** If the app's formatter or linter would rewrite an owned file (orbit's rewrote `taze.config.ts`), add it to the app's ignores. A reformatted owned file diverges on every sync.
- **Hooks.** `.husky/pre-commit` runs `bun-canary lint --staged`, which appends `--staged` to the app's own `lint` script. Opt out of `.husky/` and `husky` unless that script accepts it.
- **Deploy stamp.** An app that isn't on TanStack Start serves `/api/deploy.json` itself, with `framework`, `sha`, `target`, `template_version` and `superthread_version`, so `mk apps ls` reads it.
- **Prove the opt-outs.** At adoption, base and head are the same commit, so `--check` reports `current` whatever the stamp says. Commit a change to a clone of the template that touches carried files, opted-out files and a script, and run `MK_APPS_TEMPLATE_ROOT=<clone> mk apps sync --check <path>`. Expect `behind` with only the carried files listed.

## 2. Port the app

Work in create's bootstrap worktree. Keep every owned file as the template has it, so `mk apps sync --check <path>` reports `current`. When the app must differ, say why in the PR.

- **Routes.** Each page becomes a file route. Pages that share data sit under one pathless layout whose loader calls a `createServerFn`. The server function reads the app's state directory from an environment variable at request time, so a nightly job needs no restart. Call `router.invalidate()` on focus to pick up new data.
- **Domain code.** Copy data files, rules and their tests unchanged. Fix real bugs you find on the way, each with a test.
- **Components.** Replace hand-copied components with `@mk` items (`bunx --bun shadcn@latest add @mk/<item>`), and model each page on the gallery's mock ship pages. `shadcn add` loosens the owned `~` pins in `package.json` to `^`: restore the file and re-apply only the app's own changes (name, dependencies, scripts).
- **Checking installed items.** The shadcn CLI drops an item's leading comment lines on install (`lib/fleet.ts`, `ui/glyphs.tsx`). Compare installed files with the registry's JSON ignoring those lines; everything else matches byte for byte.
- **A Vite SPA.** An app outside Start puts the mode script first in `index.html`'s `<head>` and keeps its own `components.json` beside its sources (orbit's `web/`).
- **App CSS.** Put element defaults (`html`, `body`, `a`) in `@layer base`, so item utilities win. Scope link colour to the working panel: an unlayered `a { color }` turns the ship nav plum and fails contrast. Keep `src/page.css` to layout; values come from the tokens.
- **Landmarks.** `@mk/app-shell` 2.0.0 prints the ship's name outside every landmark. Until the item fixes it, pass `role="banner"` to `AppShellNav`.
- **Hydration.** Compute dates from a day string the server passes in, in UTC, and format times with a fixed `timeZone`. Server and client then render the same markup.
- **Tables.** At the 1120 px panel, let long text cells wrap (`whitespace-normal`) so the last column stays visible. Below 600 px, show the same rows as list rows.
- **State files.** When a job rewrites a file the server reads on every request, write a file beside it and rename it into place, and read it with one `readFile`. Overwriting in place, or `Bun.file()` after a rename, hands a reader half a file.
- **Ignored data.** `.gitignore` is owned. Keep local state out of Git with a `.gitignore` inside the data directory.
- **Owned tests.** `test/serve.test.ts` and `tools/a11y.ts` expect an `h1` and the fleet rail on `/`, a button named "paper mode", and a 404 page with a link named "back to the start".
- **Headings.** Keep buttons out of headings: a button inside an `h2` joins the heading's accessible name. happy-dom doesn't compute that, so check headings in an agent-browser snapshot.

### SQLite data

- Keep the database file where it is, outside the releases, and name it in the unit (`Environment=QUANTA_DB=%h/projects/quanta/data/quanta.db`). The server opens it lazily from that variable.
- Reach `bun:sqlite`, `node:fs` and `node:path` only through `await import()` inside server functions and server routes. After `bun run build`, grep `dist/client/assets/` for `bun:sqlite`, `node:fs` and `readFileSync` and expect no match.
- Freeze the old repository's database module as a fixture and keep a test that writes with the new code and reads with the old. Rollback depends on it.
- Before cut-over, rehearse on a copy of the live file: row counts before, after the new app and after the old app, and the same JSON from both apps.

### Binary content

- Serve audio and images from `content/` with server routes. The release is a `git archive` of the repository, so `content/` ships with it. `src/serve.ts` serves `dist/client/` first, so Vite's fingerprinted `/assets/*` files win and content files fall through to the route.
- Reject names with `/`, `\`, `..` or a leading dot. Audio answers `Accept-Ranges: bytes`, 206 with `Content-Range`, and 416 with `bytes */<size>`; the HTTP test covers each.
- Directory listings come back in a different order on the CI runner's filesystem. Don't assert an order the app doesn't sort.

### A project skill

Carry `.claude/skills/<skill>/` unchanged, then fix every path that named the old repository. Commands run from `~/projects/<name>` on Soliton, scripts live in the skill directory, and a content change ships with `bash infra/soliton/deploy.sh <merge sha>` after `git pull`.

## 3. Move the app's Soliton units

The app repository owns its units in `infra/soliton/`:

- `<name>.service`: `app.service` with the old port and the app's environment, such as its state directory or database file.
- Each timer job: a oneshot service and its timer. The service runs from `~/.local/share/start-app/<name>/current` through a `run.sh` that resolves `.env.tpl` with `op run`. Secrets never touch a file.

The vhost stays in soliton. Change it only if the app streams responses (`flush_interval -1`). A vhost change merges through the App; Maurice applies it with the attended Caddy install.

## 4. Cut over

After the app PR merges, on Soliton:

1. Back up the old units from `~/.config/systemd/user/`.
2. Clone the app repository. If the old app kept its data inside `~/projects/<name>`, make that directory the checkout in place (`git init`, add the remote, fetch, check out `main`), with the data directory ignored by its own `.gitignore`; never run `git clean -x` there. Install its units with `install -m 0644 infra/soliton/<unit> ~/.config/systemd/user/`, then run `systemctl --user daemon-reload`.
3. Run `bash infra/soliton/deploy.sh <merge sha>`. It builds, smoke-tests on the smoke port, switches `current` and restarts the unit, which replaces the old process on the same port.
4. Enable the timers. Start each timer job once by hand and check its output.
5. Verify the live URL from the tailnet: every page, the data, and the browser console. Measure a second release and a `--rollback` against the bounds: restart under 2 s, rollback under 5 s, RSS under 128 MiB. Constellation measured a 0.09 s restart to healthy, a 0.16 s rollback and 84 MiB RSS; quanta measured a 0.18 s restart, a 0.42 s rollback and 110 MiB settled. Read RSS from `VmRSS` in `/proc/<pid>/status`, idle and again 15 s after a burst of page loads. Server rendering raises the peak during a burst: quanta reached 186 MiB while rendering 40 chapters back to back under `bun --smol`, then settled to 110 MiB every round. Report the peak beside the settled number.

To roll back to the old app, restore the backed-up units, run `daemon-reload` and restart the unit. The old code stays in its old repository until step 5. After step 5, check out the retire PR's parent in a worktree of the old repository, build it there, and point the restored unit's `WorkingDirectory` at it; mauricekleine/nucleus#163 rehearses this.

## 5. Retire the old copy

- **soliton:** remove the old unit files, install the app's units from its repository in `infra/soliton/host/install-fleet.sh` (add the clone to its list and release its HEAD, and drop any build of the old copy), and update `docs/runbooks/fleet-harbor-vhosts.md` and `infra/soliton/host/README.md`. `standby.sh` keeps the same unit names.
- **The old repository:** remove the app and every reference to it.
- **dotfiles `mk-repos`:** record where the app lives and add it to the product table.

## Static apps

Artifacts had no server work: Caddy served a committed UI and the store beside it. It moved as a static app (mauricekleine/artifacts#1, mauricekleine/soliton#705). The steps above apply, with these differences.

- **Create.** Run `mk apps create <name> --target soliton --static`. A static app has no unit and no live port, so leave out `--port`. Create keeps an existing vhost and adds only the smoke-port comment, and it reuses an existing fleet entry and mark.
- **Path ownership.** When Caddy serves the app beside other content, list the paths the UI owns and route only those to `current/dist/client`. For artifacts these were `/`, `/_ui/*`, `/api/deploy.json`, `/mark.svg`, `/robots.txt`, and a fingerprinted `/assets/<name>-<hash>.<ext>` only when that file exists in the release. Every other path stays with the content. Check that no UI path can name content: artifact paths are `/<project>/<slug>/…`, and neither segment allows a dot. With the `file` matcher, a stale bundle path falls through to the content's 404 and is never cached as immutable.
- **Headers.** A UI path gets `Cache-Control: no-cache`, and a bundle that exists gets `public, max-age=31536000, immutable`. The page carries its own CSP (README, "Static on Soliton"), so the vhost's content headers stay exactly as they were. Capture `curl -sI` for every content type before and after, with an `Origin` header, and diff them case-insensitively. Only the UI's own paths should change.
- **The bare server.** `src/serve.ts` and the owned tests run without Caddy, so files the vhost takes from elsewhere still need a stand-in. Artifacts ships an empty `public/catalog.json` for the smoke run and the a11y check; Caddy always answers `/catalog.json` from the store. Keep the mark and `robots.txt` at the root of `public/`.
- **The dev mirror.** A local server that mimics the vhost over fixtures (artifacts' `tools/library.ts`) has to match the live vhost, not the old dev server. The old one sandboxed media files that live Caddy exempts. Give it an HTTP test of the header contract.
- **The release is a `git archive`.** Anything the build or the type-check imports must be in the archive. Artifacts' first try marked `fixtures/` `export-ignore`, and the release type-check then failed on two imports. Caddy serves only `dist/client/`, so fixtures in the release source are never served. To prove it, build from `git archive <sha> | tar -x` with `GITHUB_SHA=<sha>`, as `release.py` does.
- **Order.** Merge the app PR and run the first `deploy.sh` before opening the vhost PR, so an install for another reason can never point Caddy at an empty directory. Rehearse the vhost first: run a user-level Caddy on loopback with `admin off`, `auto_https off`, `persist_config off`, its own `storage` and `default_bind 127.0.0.1`. Strip the `tls` block and point it at the real release and the real content. `caddy validate` needs the DNS token, so check the full rendered harbor with `caddy adapt` against main's. Compare per-host routes with Caddy's `groupN` names normalised: only the app's host should change.
- **Cut-over.** It is the attended Caddy install (`sudo bash infra/soliton/caddy/install.sh`), Maurice's step. Then run `DEPLOY_URL=https://<name>.mauricekleine.com bun run deploy:verify <sha>` and check headers and the browser from the tailnet. Retire the old copy only after that.
- **Rollback.** `deploy.sh --rollback` swaps the previous UI release back with no Caddy change. To return to the old app, revert the vhost PR and rerun the install; the old copy stays until the retire PR.
- **Numbers.** A second artifacts release took 2.3 s end to end, build included. The switch took 0.0002 s and `--rollback` 0.18 s. Each release keeps its `node_modules` (660 MiB apparent, mostly hardlinks Bun shares from its cache), while `dist/client` is 808 KiB.

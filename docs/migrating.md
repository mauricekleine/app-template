# Migrating an app onto app-template

How an app that already runs on Soliton moves onto this template without changing its address. Constellation moved first (mauricekleine/constellation#1); quanta, artifacts and trisys follow the same steps. Orbit keeps its repository, so it skips step 1 and adopts the template in place.

## 1. Create the repository

```sh
mk apps create <name> --target soliton --port <live port>
```

`--port` keeps the live port, unit name, vhost and fleet ship. Create picks a free smoke port, prepends it as a comment to the existing vhost and copies the ship's mark. It opens two PRs:

- **The app PR.** Mark it draft at once (`gh pr ready <n> --undo`): it holds only the template's starter page until the port lands.
- **The soliton PR.** It adds the repository to the CI runner allowlists. The slot name is also hard-coded in `runner-home.py`, `migrate-runner-homes.py`, `update-runner-slots.py`, `runner-versions.py`, `runner-health.py`, `hyperspeed-ci-report.py`, their tests and the README. Extend all of them in the same PR, as soliton#697 did for constellation. None is a held host input, so the App merges it. Then run `bash infra/hyperspeed-ci/add-repo-runners.sh mauricekleine/<name>` on Soliton and confirm both runners are online in the repository's Actions settings.

To adopt the template in place instead (orbit): copy the owned files from `template.json` at one template commit, write `.mk/app.json` with that `template_sha`, and check with `mk apps sync --check <path>`.

## 2. Port the app

Work in create's bootstrap worktree. Keep every owned file as the template has it, so `mk apps sync --check <path>` reports `current`. When the app must differ, say why in the PR.

- **Routes.** Each page becomes a file route. Pages that share data sit under one pathless layout whose loader calls a `createServerFn`. The server function reads the app's state directory from an environment variable at request time, so a nightly job needs no restart. Call `router.invalidate()` on focus to pick up new data.
- **Domain code.** Copy data files, rules and their tests unchanged. Fix real bugs you find on the way, each with a test.
- **Components.** Replace hand-copied components with `@mk` items (`bunx --bun shadcn@latest add @mk/<item>`), and model each page on the gallery's mock ship pages. `shadcn add` loosens the owned `~` pins in `package.json` to `^`: restore the file and re-apply only the app's own changes (name, dependencies, scripts).
- **App CSS.** Put element defaults (`html`, `body`, `a`) in `@layer base`, so item utilities win. Scope link colour to the working panel: an unlayered `a { color }` turns the ship nav plum and fails contrast. Keep `src/page.css` to layout; values come from the tokens.
- **Landmarks.** `@mk/app-shell` 2.0.0 prints the ship's name outside every landmark. Until the item fixes it, pass `role="banner"` to `AppShellNav`.
- **Hydration.** Compute dates from a day string the server passes in, in UTC, and format times with a fixed `timeZone`. Server and client then render the same markup.
- **Tables.** At the 1120 px panel, let long text cells wrap (`whitespace-normal`) so the last column stays visible. Below 600 px, show the same rows as list rows.
- **State files.** When a job rewrites a file the server reads on every request, write a file beside it and rename it into place, and read it with one `readFile`. Overwriting in place, or `Bun.file()` after a rename, hands a reader half a file.
- **Ignored data.** `.gitignore` is owned. Keep local state out of Git with a `.gitignore` inside the data directory.
- **Owned tests.** `test/serve.test.ts` and `tools/a11y.ts` expect an `h1` and the fleet rail on `/`, a button named "paper mode", and a 404 page with a link named "back to the start".

## 3. Move the app's Soliton units

The app repository owns its units in `infra/soliton/`:

- `<name>.service`: `app.service` with the old port and the app's environment, such as its state directory.
- Each timer job: a oneshot service and its timer. The service runs from `~/.local/share/start-app/<name>/current` through a `run.sh` that resolves `.env.tpl` with `op run`. Secrets never touch a file.

The vhost stays in soliton. Change it only if the app streams responses (`flush_interval -1`); that change is a held host input.

## 4. Cut over

After the app PR merges, on Soliton:

1. Back up the old units from `~/.config/systemd/user/`.
2. Clone the app repository. Install its units with `install -m 0644 infra/soliton/<unit> ~/.config/systemd/user/`, then run `systemctl --user daemon-reload`.
3. Run `bash infra/soliton/deploy.sh <merge sha>`. It builds, smoke-tests on the smoke port, switches `current` and restarts the unit, which replaces the old process on the same port.
4. Enable the timers. Start each timer job once by hand and check its output.
5. Verify the live URL from the tailnet: every page, the data, and the browser console. Measure a second release and a `--rollback` against the bounds: restart under 2 s, rollback under 5 s, RSS under 128 MiB. Constellation measured a 0.09 s restart to healthy, a 0.16 s rollback and 84 MiB RSS; read RSS from `VmRSS` in `/proc/<pid>/status`.

To roll back to the old app, restore the backed-up units, run `daemon-reload` and restart the unit. The old code stays in its old repository until step 5.

## 5. Retire the old copy

- **soliton:** remove the old unit files, install the app's units from its repository in `infra/soliton/host/install-fleet.sh`, and update `docs/runbooks/fleet-harbor-vhosts.md`. `standby.sh` keeps the same unit names.
- **The old repository:** remove the app and every reference to it.
- **dotfiles `mk-repos`:** record where the app lives and add it to the product table.

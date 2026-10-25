#!/usr/bin/env bash
# Deploys a commit of this app to Soliton, or rolls back: bash infra/soliton/deploy.sh <commit>|--rollback
# The app's name and ports come from .mk/app.json, so this file stays identical in every app.
# Soliton's release command builds, smoke-tests on the spare port, switches and restarts the user unit.
# A static app (soliton.static) has no unit or live port: the switch alone publishes dist/client to its vhost.
set -euo pipefail
repo="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
read -r name ports < <(bun -e 'const a = await Bun.file(process.argv[1]).json(); const s = a.soliton ?? {}; const fail = (m) => { console.error(m); process.exit(2) }; if (a.target !== "soliton" || !s.smoke_port) fail(".mk/app.json needs target soliton and soliton.smoke_port"); if (s.static === true) { if (s.port) fail("a static app has no soliton.port"); console.log(a.name, `--static --smoke-port ${s.smoke_port}`) } else { if (!s.port) fail(".mk/app.json needs soliton.port, or soliton.static"); console.log(a.name, `--port ${s.port} --smoke-port ${s.smoke_port}`) }' "$repo/.mk/app.json")
# shellcheck disable=SC2086 # ports holds flags and integers only
exec "$HOME/.local/bin/hyperspeed-run" -- python3 \
  "$HOME/projects/soliton/infra/soliton/start-app/release.py" \
  --repo "$repo" --name "$name" $ports "$@"

# app-template

This is a TanStack Start app on Bun, with Soliton and Cloudflare build targets. Run commands from the repository root. Read PRODUCT.md and DESIGN.md before changing the UI, and use the global superthread-design skill for fleet design work. Install shared components through `@mk` in components.json.

- `bun run dev`: local development on 127.0.0.1:3000.
- `bun run build`: stamps and builds both targets, including `bun --check`.
- `bun run test`: tests the built Soliton server through HTTP. Build first.
- `bun run test:a11y`: axe in headless Chromium against the built Soliton server. Install the pinned Playwright browser first.
- `bun run start`: serves dist on 127.0.0.1:$PORT (3000 by default).
- `bun run deploy:verify <sha>`: waits for DEPLOY_URL to serve the expected build stamp.
- `bun run registry:install`: reinstalls the manifest's items from the live registry.

Keep copy lowercase and understated, with no em dashes. The registry owns `src/components/superthread/`; change it through a registry install. The sync boundary is template.json; files and package keys outside it belong to the app. On Soliton, `bash infra/soliton/deploy.sh <commit>|--rollback` deploys through Soliton's release command; the unit and Caddyfile in infra/soliton are install-time templates. With `soliton.static` in .mk/app.json the build prerenders to dist/client, the vhost serves it and no unit runs (README, "Static on Soliton"). `@tanstack/react-router` is pinned exactly to the version `@tanstack/react-start` depends on, so server routes type-check; move both together.

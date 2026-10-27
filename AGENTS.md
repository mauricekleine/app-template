# app-template

This is a TanStack Start app on Bun, with Soliton and Cloudflare build targets. Run commands from the repository root. Read PRODUCT.md and DESIGN.md before changing the UI, and use the global superthread-design skill for fleet design work. Install shared components through `@mk` in components.json.

- `bun run dev`: local development on 127.0.0.1:3000.
- `bun run build`: stamps and builds both targets, including `bun --check`.
- `bun run test`: tests the built Soliton server through HTTP. Build first.
- `bun run test:a11y`: axe in headless Chromium against the built Soliton server. Install the pinned Playwright browser first.
- `bun run start`: serves dist on 127.0.0.1:$PORT (3000 by default).
- `bun run deploy:verify <sha>`: waits for a stamped app's `<name>.mauricekleine.com`, or DEPLOY_URL, to serve the expected build stamp; this template checkout needs DEPLOY_URL.
- `bun run registry:install`: reinstalls the manifest's items from the live registry.

Keep copy lowercase and understated, with no em dashes. The registry owns `src/components/superthread/`; change it through a registry install. The sync boundary is template.json; files and package keys outside it belong to the app. Pushes to `main` deploy themselves: on Soliton a timer runs `bash infra/soliton/deploy.sh <commit>` through Soliton's release command (`--rollback` swaps back), and a Cloudflare app's Workers Builds trigger runs `bun run deploy`, which refuses unless `.mk/app.json` targets cloudflare; the unit and Caddyfile in infra/soliton are install-time templates. With `soliton.static` in .mk/app.json the build prerenders to dist/client, the vhost serves it and no unit runs (README, "Static on Soliton"). `@tanstack/react-router` is pinned exactly to the version `@tanstack/react-start` depends on, so server routes type-check; move both together.

# URM Desktop

Tauri 2 shell for the shared URM client in `apps/client`. This package owns the
Rust host, Tauri configuration, native permissions, icons, and the Tauri CLI;
it does not own frontend source or frontend dependencies.

```sh
pnpm --filter @urm/desktop dev
pnpm --filter @urm/desktop build
```

Tauri starts the client development server on port 1420 and loads its production
assets from `../client/dist`. The shared client starts with the PostgreSQL
account session and Foldkit Remote resources. Run `pnpm dev:server` in a
separate terminal to serve its authentication and data requests locally.

For browser-only local development, run `pnpm dev:client` and open
`http://app.localhost:1420`. Run `pnpm dev:desktop` on a machine with a
graphical desktop and the Tauri prerequisites.

# URM Client

Shared Vite/Foldkit application used by the browser, Tauri desktop shell, and
Capacitor mobile shell.

```sh
pnpm dev:client
pnpm build:client
pnpm preview:client
```

The Vite configuration loads public client configuration from the repository
root. The administration app uses the PostgreSQL account session on the central
host. Generated domain hosts serve public websites. Client startup needs no
backend-specific configuration beyond the RPC origin. The page and layout editor models
still project legacy record shapes, while their actions use PostgreSQL Remote.

Host-specific capabilities belong behind Effect services. Tauri and Capacitor
adapters can provide those services without moving shared models, updates, or
views out of this application.

## State ownership and route lifetime

Stateful sidebar areas should have identifiable child-model owners. The root
owns shared concerns such as the route, session, active workspace and shell;
feature drafts and interaction state belong to their feature. A stateless view
does not need an artificial model merely to match a navigation item.

Retained state and active work have separate lifetimes. Preserve small drafts
or filters when useful for back-navigation, but reset state when its workspace,
identity or route-parameter boundary changes. Inactive pages need not remain in
the DOM to retain their models, and retained data is never authorization.

The `init`, `subscriptions` and `managedResources` contracts in
[main.ts](src/main.ts) describe route ownership. Review cold loads as well as
navigation: both must gate route-local work, while deliberately shared shell
data can remain active. Route gating also does not make a browser-only top-level
import safe for server rendering or split it out of the bundle.

## Development and verification

Start the client and server separately with `pnpm dev:client` and
`pnpm dev:server`. Logs are written to `logs/client.log` and `logs/server.log`.
Package manifests own the executable commands; retired Confect watcher scripts
are not the current server workflow. Coding agents must not read environment
files. Use typed configuration definitions to understand required inputs.

Run a focused package typecheck or test after completing a change. Typechecking
establishes type compatibility, while tests establish only the behavior they
exercise; neither replaces a browser check when rendering or keyboard behavior
changes. Follow the root `AGENTS.md` for broader verification gates.

`llm-docs/` owns type-checked examples and generates `LLMS.md`. TSDoc owns symbol
contracts and local READMEs own workflows. Do not duplicate implementations or
migration logs into those sources. Developer Terminal contains searchable local
commands; its entries are references and do not execute themselves.

## Remote development DNS

The Vite host allowlist includes `urm.test`, its subdomains and `.localhost`.
Remote browsing needs a resolver for the chosen development suffix; adding a
Vite allowed host does not make that name resolve. A wildcard DNS resolver and
Tailscale restricted nameserver can supply the suffix on the tailnet. Configure
the resolver's address using the development machine's address, not a URL.

Check the operating-system resolver with `getent hosts test.urm.test` on Linux,
`resolvectl query test.urm.test` when using systemd-resolved, or
`dscacheutil -q host -a name test.urm.test` on macOS. A direct DNS-server query
does not test the same resolver path. Once the address resolves, diagnose the
server port and host routing separately. Host selection and authorization remain
owned by the application's routing and account boundaries.

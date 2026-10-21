# @urm/rpc

Server handler and repository layers composed by `apps/server`. The shared
account Remote API and retained RPC groups use the server's `/api/rpc` endpoint;
this package is not a standalone application or listener.

## Ownership

`@urm/contracts` defines the wire operations, `@urm/auth` resolves identity and
workspace authority, and `@urm/db` owns schema and connections. Handlers translate
operations into repository work; feature views do not own persistence.

Repositories recheck the selected workspace and related record ownership.
Transactions must use their transaction-scoped connection, including nested
reads and the snapshot returned by a write. Domain locks serialize bounds that
span multiple rows; revision checks reject stale editor writes. Provider calls
belong outside database transactions, with durable reservation where retrying
could repeat an external side effect.

## Implementation owners

- [Data](src/handlers/data/repository.ts): atomic CSV storage, revision checks,
  append replay and committed contact-import receipts.
- [Forms](src/handlers/forms/repository.ts): domain-owned definitions and fields,
  organization-owned templates and authorized reuse.
- [Chat](src/handlers/chat/repository.ts): administrator conversation access,
  bounded history and server-validated mentions.
- [Shop](src/handlers/shop/README.md): catalog, cart, order and payment boundaries.
- [Social](src/handlers/social/README.md): provider tenancy, durable submission
  and reconciliation.
- [Sysadmin](src/handlers/sysadmin/README.md): tenant/platform scope, session
  samples and telemetry ownership.
- [Publishing](src/handlers/publishing/README.md): snapshots, build assets and
  deployment lifetimes.

Older sibling implementations are not evidence that a route uses them. Follow
registration in `apps/server` and the client adapter when tracing a request.

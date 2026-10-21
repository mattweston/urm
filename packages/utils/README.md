# `@urm/utils`

Small runtime-neutral utilities shared by active URM packages and applications.

## Current responsibilities

- Browser and host classification helpers.
- Development-server URL construction.
- Class-name composition and generic value helpers.
- Currency, date, error, sanitization, and identifier helpers.
- Media URL and upload helpers used by feature views and commands.
- SEO helpers used by generated output.

Business schemas belong in `@urm/domain`. Tables, migrations, and persistence
belong in `@urm/db`; authorization belongs in `@urm/auth`. Foldkit feature
behavior belongs in `@urm/features`; reusable controls belong in `@urm/ui`.

The package has no dependency on another active `@urm/*` package. Keep it that
way unless a utility genuinely requires a shared package-level abstraction.

## Public imports

Use the export map rather than implementation paths:

```ts
import { randomHexId } from "@urm/utils"
import { classifyHost } from "@urm/utils/hosts"
import { toImageSrc } from "@urm/utils/media"
```

Never import `@urm/utils/src/**`, `@urm/utils/dist/**`, an internal path, or an
`index` filename.

The `rpc` submodule is retained only for code that has not yet been triaged; no
active application uses it as its backend client. New application data access
goes through `@urm/contracts` and `@urm/rpc` over Foldkit Remote.

## Verification

```sh
pnpm --filter @urm/utils typecheck
pnpm --filter @urm/utils test
```

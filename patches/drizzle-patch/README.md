# Drizzle ORM + Effect v4 — Bun and pnpm v11 patch

> **Status:** Working patch for the exact combo `drizzle-orm@1.0.0-beta.20` + `drizzle-kit@1.0.0-beta.20` + `effect@4.0.0-beta.42` + `@effect/sql-pg@4.0.0-beta.42`
> **Tested package managers:** `bun@1.3.12`, `pnpm@11.0.0-rc.0`
> **Context:** [drizzle-team/drizzle-orm#5484](https://github.com/drizzle-team/drizzle-orm/pull/5484) (unmerged PR), [drizzle-team/drizzle-orm#5414](https://github.com/drizzle-team/drizzle-orm/issues/5414)
> **Scope:** This gist is intentionally version-specific. If you move to a different Drizzle beta or different Effect beta, re-test or regenerate the patch.

Drizzle ORM 1.0 ships a built-in Effect integration at `drizzle-orm/effect-postgres`, but the published `drizzle-orm@1.0.0-beta.20` package targets Effect v3 APIs. This patch updates that integration to work with Effect v4 for the exact versions above.

The patch file in this gist is manager-neutral. The patch contents work with both Bun and pnpm v11. What differs is only where each package manager expects patch registration.

## Supported version matrix

| Package | Supported / tested |
|---------|--------------------|
| `drizzle-orm` | `1.0.0-beta.20` only |
| `drizzle-kit` | `1.0.0-beta.20` only |
| `effect` | `4.0.0-beta.42` only |
| `@effect/sql-pg` | `4.0.0-beta.42` only |
| `bun` | `1.3.12` |
| `pnpm` | `11.0.0-rc.0` |

Do not assume this patch is safe for later `drizzle-orm` betas or later `effect` betas. It touches internal Effect integration files and package metadata, so treat it as an exact-version patch until you revalidate it.

## What the patch changes

21 files patched across JS runtime and `.d.ts` declarations:

| Area | Files | Key changes |
|------|-------|-------------|
| **Services** | `effect-core/logger`, `cache/core/cache-effect` | `Effect.Service()` → `ServiceMap.Service()()`, removed `accessors: true`, added `Default` layer |
| **Effect protocol** | `effect-core/query-effect` | `Effectable.CommitPrototype` → custom v4 Effect protocol (`~effect/Effect` TypeId) |
| **Errors** | `effect-core/errors` | `Schema.TaggedError()` → `Schema.TaggedErrorClass()`, `Schema.Literal()` → `Schema.Literals([])` |
| **Session** | `effect-postgres/session`, `pg-core/effect/session` | `Effect.gen(this, ...)` → `Effect.gen({ self: this }, ...)`, accessor calls → direct method calls, `Effect.catchAll` → `Effect.catch` |
| **Schema** | `effect-schema/column`, `effect-schema/schema` | `Schema.Union(a,b)` → `Schema.Union([a,b])`, `Schema.Record({key,value})` → `Schema.Record(key,value)`, `.pipe(Schema.X())` → `.check(Schema.isX())`, `Schema.Object` → `Schema.ObjectKeyword`, `Schema.UUID` → `Schema.String.check(Schema.isUUID())` |
| **Type declarations** | All corresponding `.d.ts` files | `Schema.Any` → `Top`, `Array$` → `$Array`, `Literal` → `Literals`, `@effect/sql/SqlError` → `effect/unstable/sql/SqlError`, `EffectCache` → `EffectCacheShape` |

## Quick start

### 1. Set exact package versions

Use the exact tested versions:

```jsonc
{
  "dependencies": {
    "drizzle-orm": "1.0.0-beta.20",
    "effect": "4.0.0-beta.42",
    "@effect/sql-pg": "4.0.0-beta.42",
    "pg": "^8.16.0"
  },
  "devDependencies": {
    "drizzle-kit": "1.0.0-beta.20"
  }
}
```

If your project still uses `@effect/sql-drizzle`, remove it and migrate to `drizzle-orm/effect-postgres`.

### 2. Download and save the patch

```bash
mkdir -p patches

curl -sL https://gist.githubusercontent.com/benpsnyder/b00bdb74d841a4b1339f05070ae0b363/raw/drizzle-orm-effect-v4.patch \
  -o patches/drizzle-orm@1.0.0-beta.20.patch
```

Or copy `drizzle-orm-effect-v4.patch` from this gist into `patches/drizzle-orm@1.0.0-beta.20.patch`.

### 3. Register the patch

#### Bun

Add this to the root `package.json`:

```json
{
  "patchedDependencies": {
    "drizzle-orm@1.0.0-beta.20": "patches/drizzle-orm@1.0.0-beta.20.patch"
  }
}
```

#### pnpm v11

Add this to the repo-root `pnpm-workspace.yaml`:

```yaml
patchedDependencies:
  drizzle-orm@1.0.0-beta.20: patches/drizzle-orm@1.0.0-beta.20.patch
```

If `pnpm-workspace.yaml` already exists, merge the stanza into the existing file. For pnpm v11, do not rely on the Bun-style root `package.json` patch registration.

### 4. Install

#### Bun

```bash
bun install
```

#### pnpm v11

```bash
pnpm install
```

The same patch file above was verified locally with both `bun install` and `pnpm install`.

## Migration guide — your code changes

### Replace `@effect/sql-drizzle/Pg` with `drizzle-orm/effect-postgres`

```typescript
// BEFORE (Effect v3 + @effect/sql-drizzle)
import * as PgDrizzle from '@effect/sql-drizzle/Pg';
import { PgClient } from '@effect/sql-pg';
import { Config, Layer, Redacted } from 'effect';

const PgLive = PgClient.layerConfig({ /* ... */ });
const DrizzleLive = PgDrizzle.layer.pipe(Layer.provide(PgLive));

// In services:
const drizzle = yield* PgDrizzle;
const rows = yield* drizzle.select().from(myTable);

// AFTER (Effect v4 + drizzle-orm/effect-postgres)
import * as DrizzleEffect from 'drizzle-orm/effect-postgres';
import { PgClient } from '@effect/sql-pg';
import type { EffectPgDatabase } from 'drizzle-orm/effect-postgres';
import { Config, Effect, Layer, Redacted, ServiceMap } from 'effect';

// Define a service tag for DI
export type PgDrizzle = EffectPgDatabase & { $client: PgClient.PgClient };
export const PgDrizzle = ServiceMap.Service<PgDrizzle>('PgDrizzle');

const PgLive = PgClient.layerConfig({ /* ... */ });
const DrizzleLive = Layer.effect(
  PgDrizzle,
  DrizzleEffect.makeWithDefaults() as Effect.Effect<PgDrizzle, never, PgClient.PgClient>,
);
const DatabaseLive = Layer.provideMerge(DrizzleLive, PgLive);

// In services — same pattern, yield* still works:
const drizzle = yield* PgDrizzle;
const rows = yield* drizzle.select().from(myTable);
```

### Replace `@effect/sql/SqlError`

```typescript
// BEFORE
import { SqlError } from '@effect/sql/SqlError';

// AFTER
import { SqlError } from 'effect/unstable/sql/SqlError';
```

### Replace `Context.Tag` with `ServiceMap.Service`

```typescript
// BEFORE
import { Context } from 'effect';
class MyService extends Context.Tag('MyService')<MyService, MyInterface>() {}

// AFTER
import { ServiceMap } from 'effect';
class MyService extends ServiceMap.Service<MyService, MyInterface>()('MyService') {}
```

### Replace `Effect.flatMap(ServiceTag, fn)` with `ServiceTag.use(fn)`

```typescript
// BEFORE
export const getItems = () => Effect.flatMap(MyService, (s) => s.getItems());

// AFTER
export const getItems = () => MyService.use((s) => s.getItems());
```

### Replace `Config.integer` with `Config.int`

```typescript
// BEFORE
port: Config.integer('DB_PORT'),

// AFTER
port: Config.int('DB_PORT'),
```

## Assistant instructions

Point an agent at this gist with a prompt like:

> Use the patch file and migration guide from this gist to upgrade my project from Effect v3 to Effect v4 with drizzle-orm. Apply the correct Bun or pnpm v11 patch wiring, update package versions, and migrate my source code following the patterns shown.

The agent should:

1. Save the patch file to `patches/drizzle-orm@1.0.0-beta.20.patch`.
2. If the project uses Bun, add `patchedDependencies` to the root `package.json`.
3. If the project uses pnpm v11, add `patchedDependencies` to the repo-root `pnpm-workspace.yaml`.
4. Pin `drizzle-orm`, `drizzle-kit`, `effect`, and `@effect/sql-pg` to the exact tested versions in this gist.
5. Remove `@effect/sql-drizzle` usage and migrate imports to `drizzle-orm/effect-postgres`.
6. Update `@effect/sql/SqlError` imports to `effect/unstable/sql/SqlError`.
7. Update `Context.Tag` patterns to `ServiceMap.Service`.
8. Update `Effect.flatMap(ServiceTag, ...)` patterns to `ServiceTag.use(...)`.
9. Run `bun install` or `pnpm install`, depending on the project.
10. Run `tsc --noEmit` or the project’s normal typecheck to verify.

## Versions tested

| Package | Version |
|---------|---------|
| `drizzle-orm` | `1.0.0-beta.20` |
| `drizzle-kit` | `1.0.0-beta.20` |
| `effect` | `4.0.0-beta.42` |
| `@effect/sql-pg` | `4.0.0-beta.42` |
| `bun` | `1.3.12` |
| `pnpm` | `11.0.0-rc.0` |

## Related links

- [drizzle-team/drizzle-orm#5484](https://github.com/drizzle-team/drizzle-orm/pull/5484) — upstream PR (unmerged)
- [drizzle-team/drizzle-orm#5414](https://github.com/drizzle-team/drizzle-orm/issues/5414) — discussion
- [Effect v4 beta blog post](https://effect.website/blog/releases/effect/40-beta/)
- [drizzle-orm/effect-postgres docs](https://orm.drizzle.team/docs/connect-effect-postgres)

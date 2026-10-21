# Database

## Migrations

### Two-Part System

#### 1. Drizzle-Kit CLI (manual)

Use Drizzle-Kit locally to generate migration files from schema changes.

```bash
# 1. Modify schema in packages/db/src/schema/

# 2. Generate a migration file
pnpm drizzle-kit generate

# 3. Apply pending migrations with the migrator you use for the target environment
```

`drizzle-kit generate` creates migration files in `packages/db/src/migrations/`.

#### 2. Drizzle Runtime Migrator (automatic)

The Effect migrator applies existing migration files.

Startup flow:

1. Generate migration files from schema changes
2. Run `migrator()` through the normal migrator entrypoint for that environment
3. `MigratorEnvironmentLive` calls `migrate()` from `drizzle-orm`
4. Drizzle reads migration files from `packages/db/src/migrations/`
5. Drizzle applies only pending migrations to the current database

The runtime migrator does not generate migrations.
It only applies migration files that already exist.

#### Recommended Workflow

1. Change schema and run `drizzle-kit generate` to create a migration file.
2. Apply pending migrations with the same migrator flow in dev/stage/prod.
3. For one-time cleanup from old `push` state in dev, reset the database manually before rerunning migrations.

## Multi-Environment Setup

This package now supports environment-specific database configurations:

- **Development** (`NODE_ENV=development`): 10 connections, full logging, traditional migrations
- **Staging** (`NODE_ENV=staging`): 15 connections, slow query logging, traditional migrations
- **Production** (`NODE_ENV=production`): 25 connections, error-only logging, traditional migrations
- **Demo** (`IS_DEMO=true`): Separate database for marketing site demos

### Environment Variables

```bash
# Required for all environments
DATABASE_URL_DEV=postgresql://...
DATABASE_URL_STAGE=postgresql://...
DATABASE_URL_PROD=postgresql://...
DATABASE_URL_DEMO=postgresql://...  # For demo site
```

### Usage

```typescript
import { DatabaseLive, DatabaseDemoLive, DB } from "@urm/db";

// Auto-selects based on NODE_ENV
const program = Effect.gen(function* () {
  const db = yield* DB;
  // Uses correct pool/logging for current environment
}).pipe(Effect.provide(DatabaseLive));

// Demo database (marketing site)
const demoProgram = Effect.gen(function* () {
  const db = yield* DB;
  // Connected to separate demo database
}).pipe(Effect.provide(DatabaseDemoLive));
```

See [MIGRATION-GUIDE.md](./MIGRATION-GUIDE.md) for environment-specific migration strategies.

## Demo Database

The demo database starts empty and can be populated on-demand via UI controls.

### Seeding Utilities

```typescript
import {
  addDemoData,
  addDemoDataPreset,
  clearDemoData,
  countDemoRows
} from "@urm/db";

// Add specific amounts
yield* addDemoData(100, 900); // 100 users, 900 todos

// Use preset amounts (10, 50, 100, 1000, 10000)
yield* addDemoDataPreset(1000);

// Check current count
const counts = yield* countDemoRows;
// { users: 500, todos: 4500, total: 5000 }

// Clear all data
yield* clearDemoData;
```

### Features

- **Max 50,000 rows** total limit
- **Batch inserts** (1,000 rows per batch) for PlanetScale optimization
- **Ratio**: 10% users, 90% todo items
- **Fake data**: Realistic names, emails, tasks using faker.js

See [DEMO-DB-SETUP.md](./DEMO-DB-SETUP.md) for complete setup instructions.

## Schema

- [Effect Postgres](https://orm.drizzle.team/docs/connect-effect-postgres)
- [Effect SQL Model](https://www.npmjs.com/package/@emergente-labs/effect-sql-model)

## CLI

- [RPG](https://github.com/NikolayS/rpg)

## Resources

- [Hyperdrive - Alchemy](https://alchemy.run/providers/cloudflare/hyperdrive/)
- [PlanetScale - Alchemy](https://alchemy.run/providers/planetscale/)
- [PlanetScale PostGres - Alchemy](https://alchemy.run/guides/planetscale-postgres/)

Production-grade Drizzle ORM integration with Effect-TS for the URM server.

## Overview

This module provides a type-safe, composable database layer using:

- **Drizzle ORM** (v1.0.0-beta.9+) - Lightweight SQL query builder with TypeScript
- **@effect/sql-pg** - PostgreSQL driver with native Effect integration
- **Effect-TS** - Functional effect system for dependency injection and error handling

## Quick Start

### Basic Usage

```ts
import { DB, DatabaseLive } from "@urm/db/layer";
import * as Effect from "effect/Effect";

const program = Effect.gen(function* () {
  const db = yield* DB;
  const allUsers = yield* db.select().from(schema.users);
  return allUsers;
});

Effect.runPromise(program.pipe(Effect.provide(DatabaseLive)));
```

### In HTTP Handlers

```ts
import { HttpRouter, HttpServerResponse } from "@effect/platform";
import { DB, DatabaseLive } from "./db/layer";
import * as Effect from "effect/Effect";

const listUsersHandler = HttpRouter.get(
  "/users",
  Effect.gen(function* () {
    const db = yield* DB;
    const users = yield* db.select().from(schema.users);
    return HttpServerResponse.json(users);
  }),
);
```

## Architecture

### Service Tags

The module exports a single service tag for dependency injection:

```ts
export class DB extends Context.Tag("DB")<
  DB,
  PgDrizzle.EffectPgDatabase<typeof schema, typeof relations>
>() {}
```

### Layers

#### `DatabaseLive` (Production)

Provides the `DB` service with all dependencies for production use:

```ts
// Includes:
// - PostgreSQL connection (PgClientLive)
// - Drizzle ORM initialization
// - Schema and relations configuration
export const DatabaseLive = Layer.effect(
  DB,
  Effect.gen(function* () {
    const client = yield* PgClient.PgClient;
    return PgDrizzle.drizzle(client, { schema, relations });
  }),
).pipe(Layer.provide(PgClientLive));
```

#### `DatabaseMock` (Testing)

Provides a mock database instance for testing without a real PostgreSQL connection:

```ts
export const DatabaseMock = Layer.succeed(
  DB,
  PgDrizzle.drizzle.mock({ schema, relations }),
);
```

#### `PgClientLive` (Internal)

Configures the PostgreSQL client with custom type parsers:

```ts
export const PgClientLive = PgClient.layer({
  url: Redacted.make(process.env.DATABASE_URL!),
  types: {
    getTypeParser: (typeId, format) => {
      // Preserve date/time types for Drizzle handling
      if ([1184, 1114, 1082, 1186, ...].includes(typeId)) {
        return (val: unknown) => val
      }
      return types.getTypeParser(typeId, format)
    }
  }
})
```

## Query Examples

### SELECT

```ts
// Get all records
const all = yield * db.select().from(schema.users);

// With WHERE clause
const filtered =
  yield * db.select().from(schema.users).where(eq(schema.users.isActive, true));

// With ORDER BY
const sorted =
  yield * db.select().from(schema.users).orderBy(schema.users.createdAt);
```

### INSERT

```ts
const newUser =
  yield *
  db.insert(schema.users).values({
    name: "John",
    email: "john@example.com",
  });
```

### UPDATE

```ts
const updated =
  yield *
  db
    .update(schema.users)
    .set({ name: "Jane" })
    .where(eq(schema.users.id, userId));
```

### DELETE

```ts
yield * db.delete().from(schema.users).where(eq(schema.users.id, userId));
```

## Error Handling

All database operations return `Effect<Result, Error, R>` with proper error typing:

```ts
const program = Effect.gen(function* () {
  const db = yield* DB;

  try {
    const result = yield* db.select().from(schema.users);
    return result;
  } catch (error) {
    yield* Effect.logError("Database error", error);
    throw error;
  }
});
```

For domain-specific errors, define `Schema.TaggedError` types:

```ts
import * as Schema from "effect/Schema";

export class UserNotFound extends Schema.TaggedError<UserNotFound>()(
  "UserNotFound",
  { userId: Schema.String },
) {
  get message(): string {
    return `User ${this.userId} not found`;
  }
}
```

## Logging Configuration

By default, DatabaseLive uses no-op logging (production-optimized).

### Enable Query Logging

To log queries during development:

```ts
import { EffectLogger } from "drizzle-orm/effect-postgres";

const dbWithLogging = PgDrizzle.make({
  schema,
  relations,
}).pipe(
  Effect.provide(EffectLogger.layer),
  Effect.provide(PgDrizzle.DefaultServices),
);
```

See `logger.ts` for more logging options.

## Migrations

Migrations are generated by Drizzle Kit from schema changes.

### Generate Migration

```bash
bun run -w drizzle-kit:generate
```

### Run Migrations

Drizzle handles migrations automatically on connection. For manual control, see `migrator.ts`.

## Testing

### Using Mock Database

```ts
import { DatabaseMock } from "@urm/db/layer";
import { it } from "@effect/vitest";

it.effect("fetches users", () =>
  Effect.gen(function* () {
    const db = yield* DB;
    const users = yield* db.select().from(schema.users);
    expect(users).toEqual([]);
  }).pipe(Effect.provide(DatabaseMock)),
);
```

### With Real Database (Integration Tests)

```ts
// Set up a test database container
import { PgContainer } from "./test/PgContainer";

it.layer(PgContainer.ClientLive)("users", (it) => {
  it.effect("persists and retrieves", () =>
    Effect.gen(function* () {
      const db = yield* DB;
      // Test with real database
    }),
  );
});
```

See `tests/layer.test.ts` for complete examples.

## Schema

Schemas are defined using Drizzle's DSL and organized by feature in each package:

```ts
// packages/_schema/src/main.ts - aggregates all schemas
export * from "@urm/tasks/schema";
export * from "@urm/contacts/schema";
// etc.
```

Each package defines its tables in `src/schema/index.ts`:

```ts
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

## Relations

Relations are defined in `schema/relations.ts` using Drizzle's relation API:

```ts
export const relations = defineRelations(schema, (r) => ({
  users: {
    contacts: r.many.contacts({
      from: r.users.id,
      to: r.contacts.user_id,
    }),
  },
  contacts: {
    user: r.one.users({
      from: r.contacts.user_id,
      to: r.users.id,
    }),
  },
}));
```

## Type Safety

The module ensures full type safety:

```ts
// ✅ Type-safe column access
const name = user.name; // string
const age = user.age; // number

// ✅ Type-safe queries
const query = db.select().from(schema.users).where(eq(schema.users.id, userId));

// ✅ Type-safe results
const results: typeof schema.users.$ = yield * query;
```

## Cross-Package Dependency Injection

The tasks package (and others) receive the database via the `DatabaseClient` interface:

```ts
// In main.ts
import { DatabaseClient } from "@urm/tasks";

const DatabaseClientLive = Layer.effect(
  DatabaseClient,
  Effect.gen(function* () {
    const db = yield* DB;
    return db as any; // Interface adapter
  }),
).pipe(Layer.provide(DatabaseLive));
```

## Environment Configuration

### Required Environment Variables

Copy `env.example.md` to `.env` and fill in your values:

```bash
cp env.example.md .env
```

```bash
# Development database
DATABASE_URL_DEV=postgresql://user:pass@localhost:5432/urm_dev

# Staging database
DATABASE_URL_STAGE=postgresql://user:pass@localhost:5432/urm_stage

# Production database
DATABASE_URL_PROD=postgresql://user:pass@localhost:5432/urm_prod

# Demo database (for marketing site)
DATABASE_URL_DEMO=postgresql://user:pass@localhost:5432/urm_demo

# Optional: Enable demo mode
IS_DEMO=false
```

### Environment-Specific Settings

| Variable        | Dev           | Stage      | Prod         | Demo         |
| --------------- | ------------- | ---------- | ------------ | ------------ |
| `NODE_ENV`      | `development` | `staging`  | `production` | `production` |
| Max Connections | 10            | 15         | 25           | 15           |
| Query Timeout   | None          | 30s        | 60s          | 30s          |
| SQL Logging     | All           | Slow (>1s) | None         | Slow (>1s)   |
| Migrations      | Skip          | Run        | Run          | Run          |

See `.env.example` for a complete template.

## Module Files

- **`layer.ts`** - Core database layer with DB service and layers
- **`logger.ts`** - Query logging configuration and options
- **`migrator.ts`** - Database migration orchestration with Effect
- **`schema/relations.ts`** - Drizzle relation definitions
- **`bridge.ts`** - Database client adapter for cross-package injection
- **`api.ts`** - Reference documentation (deprecated, use layer.ts)
- **`db.ts`** - Backwards compatibility alias to layer.ts
- **`drizzle.config.ts`** - Drizzle Kit configuration for migrations
- **`tests/layer.test.ts`** - Comprehensive test suite

## Key Principles

1. **Effect Integration** - All async operations are Effect-based for composability
2. **Service Pattern** - Database is injected as a Context.Tag service
3. **Layer Composition** - Dependencies are explicitly composed for testability
4. **Type Safety** - Full TypeScript support with no type casts where possible
5. **Deep Modules** - Database is a deep module with simple interface, complex implementation
6. **No Global State** - Connection pooling is managed by layers, not globals

## Troubleshooting

### "Invalid NODE_ENV" Error

**Problem**: Application fails to start with "Invalid NODE_ENV" error.

**Solution**: Ensure `NODE_ENV` is set to one of: `development`, `staging`, `production`.

```bash
# Correct
NODE_ENV=development pnpm dev

# Incorrect
NODE_ENV=dev pnpm dev  # Will fail
```

### "Missing DATABASE*URL*\*" Error

**Problem**: Application fails with missing database URL error.

**Solution**: Check that the correct environment variable is set for your `NODE_ENV`:

| NODE_ENV      | Required Variable    |
| ------------- | -------------------- |
| `development` | `DATABASE_URL_DEV`   |
| `staging`     | `DATABASE_URL_STAGE` |
| `production`  | `DATABASE_URL_PROD`  |

### Migration Failures

**Problem**: Migrations fail in staging/production.

**Common Causes**:

1. **Migrations folder missing**: Run `drizzle-kit generate` to create migration files
2. **Breaking changes**: Adding non-nullable columns without defaults
3. **Connection issues**: Check DATABASE_URL is correct and database is accessible

**Solution**:

```bash
# 1. Generate migrations
cd packages/db
npx drizzle-kit generate

# 2. Review generated SQL in src/migrations/

# 3. Test on staging first
NODE_ENV=staging pnpm --filter @urm/rpc start

# 4. Apply to production
NODE_ENV=production pnpm --filter @urm/rpc start
```

### Connection Pool Exhaustion

**Problem**: "Too many connections" or connection timeout errors.

**Symptoms**:

- Requests timing out
- "Connection pool exhausted" errors
- High latency

**Solutions**:

1. **Reduce pool size**: Adjust `maxConnections` in `src/config/pool-config.ts`
2. **Check for connection leaks**: Ensure database connections are properly closed
3. **Scale PlanetScale**: Upgrade to higher tier if consistently hitting limits
4. **Add connection timeout**: Ensure `connectTimeout` is set appropriately

### Demo Database Not Connecting

**Problem**: Demo site cannot connect to demo database.

**Checks**:

1. Verify `DATABASE_URL_DEMO` is set
2. Ensure `DATABASE_URL_DEMO` ≠ `DATABASE_URL_PROD` (safety check)
3. Check demo database exists in PlanetScale console

### Slow Queries in Production

**Problem**: Queries taking > 60s (prod timeout).

**Solutions**:

1. **Add indexes**: Check query plans with `EXPLAIN ANALYZE`
2. **Optimize queries**: Reduce data fetched, use pagination
3. **Increase timeout**: Modify `query_timeout_ms` in pool config (temporary fix)
4. **Connection pooling**: Ensure pool size matches workload

### Reset Demo Database

**Manual reset**:

```bash
cd packages/db
npx tsx scripts/reset-demo-db.ts
```

**Automated reset** (daily at midnight UTC):
See GitHub Actions workflow in `.github/workflows/reset-demo-db.yml`

## Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [Drizzle Effect PostgreSQL](https://orm.drizzle.team/docs/connect-effect-postgres)
- [Effect-TS Documentation](https://effect.website)
- [@effect/sql-pg](https://github.com/Effect-TS/effect/tree/main/packages/sql-pg)
- [MySQL for Developers](https://planetscale.com/learn/courses/mysql-for-developers/)

## Related

- `@urm/tasks` - Example package using DatabaseClient
- `apps/server` - Main server application

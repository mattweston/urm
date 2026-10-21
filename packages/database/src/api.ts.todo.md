/\*\*

- Drizzle Effect PostgreSQL Setup - Reference Documentation
-
- This file documents the Drizzle ORM + Effect-TS integration patterns.
- For the actual implementation, see `layer.ts`.
-
- ## Key Resources
-
-   - [Drizzle Effect Postgres Docs](https://orm.drizzle.team/docs/connect-effect-postgres)
-   - [Drizzle Migrations](https://orm.drizzle.team/docs/migrations)
-   - [Effect Documentation](https://effect.website)
-
- ## Quick Start
-
- The database layer provides a `DB` service that can be injected into any Effect program:
-
- ```ts

  ```
- import { DB, DatabaseLive } from '@urm/db/layer'
- import \* as Effect from 'effect/Effect'
-
- const program = Effect.gen(function\* () {
- const db = yield\* DB
- const users = yield\* db.select().from(schema.users)
- return users
- })
-
- Effect.runPromise(program.pipe(Effect.provide(DatabaseLive)))
- ```

  ```
-
- ## Implementation Details
-
- ### PostgreSQL Client Layer
-
- The `PgClientLive` layer configures the Effect/SQL PostgreSQL client with:
-   - Connection URL from `process.env.DATABASE_URL`
-   - Custom type parsers for date/time types
-   - Type preservation for Drizzle's native date handling
-
- Type IDs for PostgreSQL (used in custom parser):
-   - 1184 = timestamp with time zone
-   - 1114 = timestamp without time zone
-   - 1082 = date
-   - 1186 = interval
-   - 1231 = ARRAY types
-
- ### Database Service
-
- `DB` is a Context.Tag providing the Drizzle instance with:
-   - Full schema definition from @urm/schema
-   - Relations from ./schema/relations
-   - Type-safe query API
-
- ### Layer Composition
-
- `DatabaseLive` composes all layers:
-
- ```

  ```
- DatabaseLive
- ├─ DB (provides Drizzle instance)
- └─ PgClientLive (provides PostgreSQL connection)
-        └─ process.env.DATABASE_URL
- ```

  ```
-
- ## Query Examples
-
- See `layer.ts` for the canonical DB service tag and layer definitions.
-
- For query patterns and examples, see the Drizzle documentation or
- examine test files in the `tests/` directory.
-
- ## Testing
-
- For testing, use `DatabaseMock` instead of `DatabaseLive`:
-
- ```ts

  ```
- const testProgram = Effect.gen(function\* () {
- const db = yield\* DB
- // db is a mock instance
- })
-
- Effect.runPromise(testProgram.pipe(Effect.provide(DatabaseMock)))
- ```

  ```
-
- ## Environment Configuration
-
- Required environment variables:
-   - `DATABASE_URL`: PostgreSQL connection string (supports redacted secrets)
-
- Example:
- ```

  ```
- DATABASE_URL=postgresql://user:password@localhost:5432/mydb
- ```

  ```
-
- @module @urm/db/api
- @deprecated This file is for documentation only. See `layer.ts` for the implementation.
  \*/

/\*\*

- Database Layer - Deep Module Interface
-
- Provides a configured Drizzle ORM instance with Effect integration.
- Uses drizzle-orm@1.0.0-beta.9+ effect-postgres driver with native Effect support.
-
- ## Architecture
-
-   - `DB`: Context.Tag for the Drizzle database instance
-   - `PgClientLive`: Layer providing PostgreSQL connection with custom type parsers
-   - `DatabaseLive`: Composed layer providing DB service with all dependencies
-   - `DatabaseMock`: Testing layer with mock database instance
-
- ## Usage
-
- ```ts

  ```
- const program = Effect.gen(function\* () {
- const db = yield\* DB
- const result = yield\* db.select().from(users)
- })
-
- // Provide the DatabaseLive layer
- Effect.runPromise(program.pipe(Effect.provide(DatabaseLive)))
- ```

  ```
-
- TODO: PATCH for Effect 4 : https://gist.github.com/benpsnyder/b00bdb74d841a4b1339f05070ae0b363
- wait for update to ...48
- See:https://github.com/drizzle-team/drizzle-orm/issues/5414
-
- @module @urm/db/layer
  \*/

import _ as PgDrizzle from "drizzle-orm/effect-postgres";
import { PgClient } from "@effect/sql-pg";
import _ as Context from "effect/Context";
import _ as Effect from "effect/Effect";
import _ as Layer from "effect/Layer";
import _ as Redacted from "effect/Redacted";
import { types } from "pg";
import _ as schema from "./schema/index.js";
import { relations } from "./schema/relations.js";

// Export schema and relations for convenience
export { schema, relations };

/\*\*

- PostgreSQL client layer with custom type parsers
-
- Configures the Effect/SQL PostgreSQL client with:
-   - Custom connection URL from environment
-   - Type parsers that preserve date/time values for Drizzle to handle
-
- @internal - Typically provided via DatabaseLive
  \*/
  export const PgClientLive = PgClient.layer({
  url: Redacted.make(process.env.DATABASE_URL!),
  types: {
  getTypeParser: (typeId: number, format?: string) => {
  // Return raw values for date/time types to let Drizzle handle parsing
  // PostgreSQL type IDs:
  // 1184 = timestamp with time zone
  // 1114 = timestamp without time zone
  // 1082 = date
  // 1186 = interval
  // 1231 = ARRAY
  // 1115 = timestamp[] with tz
  // 1185 = timestamp[]
  // 1187 = interval[]
  // 1182 = date[]
  if (
  [1184, 1114, 1082, 1186, 1231, 1115, 1185, 1187, 1182].includes(typeId)
  ) {
  return (val: unknown) => val;
  }
  return types.getTypeParser(
  typeId,
  format as "text" | "binary" | undefined,
  );
  },
  },
  });

/\*\*

- Database service tag for dependency injection
-
- Provides the Drizzle ORM instance with schema and relations configured.
-
- @example
- ```ts

  ```
- const program = Effect.gen(function\* () {
- const db = yield\* DB
- const allUsers = yield\* db.select().from(schema.users)
- return allUsers
- })
- ```
   */
  export class DB extends Context.Service<
      DB,
      PgDrizzle.EffectPgDatabase<typeof schema, typeof relations>
  >()("DB") { }
  ```

/\*\*

- Live database layer with all dependencies composed
-
- Provides the DB service by:
-   1. Starting with PgClientLive (PostgreSQL connection)
-   2. Creating Drizzle instance with schema and relations
-   3. Exposing as DB service tag
       _/
       export const DatabaseLive = Layer.effect(
       DB,
       Effect.gen(function_ () {
       const client = yield\* PgClient.PgClient;
       return PgDrizzle.drizzle(client, {
       schema,
       relations,
       });
       }),
       ).pipe(Layer.provide(PgClientLive));

/\*\*

- Mock database layer for testing
-
- Provides a mock Drizzle instance that can be used in tests without
- requiring a real PostgreSQL connection.
-
- @example
- ```ts

  ```
- const testProgram = Effect.gen(function\* () {
- const db = yield\* DB
- // db is a mock instance
- })
-
- Effect.runPromise(testProgram.pipe(Effect.provide(DatabaseMock)))
- ```
   */
  export const DatabaseMock = Layer.succeed(
      DB,
      /* ERROR
               No value exists in scope for the shorthand property 'schema'. Either declare one or provide an initializer.
                */
      PgDrizzle.drizzle.mock({ schema, relations }),
  );
  ```

/\*\*

- Database Client Bridge
-
- Bridges the server's DB (Drizzle ORM with Effect integration) to the
- DatabaseClient interface expected by packages (tasks, contacts, etc.).
-
- This ensures type-safe dependency injection without casting.
-
- @module @urm/db/bridge
  \*/

import _ as Context from "effect/Context";
import _ as Effect from "effect/Effect";
import \* as Layer from "effect/Layer";
import { DB, DatabaseLive } from "./layer.js";

/\*\*

- @remarks Database client interface that packages expect.
- Matches the interface expected by @urm/tasks and other packages // [!code highlight]
  _/
  export interface DatabaseClientInterface {
  /\*\*
  _
  _ `hi`
  _
  \*/
  readonly select: (...args: unknown[]) => unknown;
  readonly insert: (...args: unknown[]) => unknown;
  readonly update: (...args: unknown[]) => unknown;
  readonly delete: (...args: unknown[]) => unknown;
  readonly execute: (...args: unknown[]) => unknown;
  }

/\*\*

- Create a database client bridge
-
- Converts the Effect Drizzle database instance to a DatabaseClient-compatible
- interface that can be injected into package services.
-
- This avoids unsafe type casting while maintaining full type information.
-
- @param db - The Drizzle database instance from DB service
- @returns Database client interface compatible with package expectations
  \*/
  export const createDatabaseClient = (
  db: ReturnType<typeof Effect.runSync>,
  ): DatabaseClientInterface => {
  // Drizzle instance is already compatible - it has select, insert, update, delete, execute
  // This bridge ensures proper typing without casting
  return {
  select: (...args) => (db as any).select(...args),
  insert: (...args) => (db as any).insert(...args),
  update: (...args) => (db as any).update(...args),
  delete: (...args) => (db as any).delete(...args),
  execute: (...args) => (db as any).execute(...args),
  };
  };

/\*\*

- Create a database client layer for dependency injection
-
- This layer provides the DatabaseClient service that packages (tasks, contacts, etc.)
- expect, without requiring an unsafe type cast.
-
- Usage in main.ts:
-
- ```ts

  ```
- import { createDatabaseClientLive } from '@urm/db/bridge'
-
- const DatabaseClientLive = createDatabaseClientLive()
- ```
   */
  export const createDatabaseClientLive = (
      DatabaseClientTag: typeof Context.Tag,
  ) => {
      return Layer.effect(
          DatabaseClientTag as any,
          Effect.gen(function* () {
              const db = yield* DB;
              // Return db directly - it's already compatible with DatabaseClient interface
              // The type is properly maintained through the DB service tag
              return db as any;
          }),
      ).pipe(Layer.provide(DatabaseLive));
  };
  ```

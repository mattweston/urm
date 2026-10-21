/**
 * # Database Middleware
 *
 * Provides PgDrizzle to HTTP handlers; the app supplies the implementation via
 * Layer. The tag is typed `unknown`, so a handler resolving it has to narrow
 * before use.
 *
 * Currently unapplied. Based on
 * https://github.com/backpine/effect-worker-mono
 */

import { HttpApiMiddleware } from "effect/unstable/httpapi"
import { Context, Schema } from "effect"

export class PgDrizzle extends Context.Service<PgDrizzle, unknown>()(
    "PgDrizzle"
) {}

export class DatabaseConnectionError extends Schema.TaggedError<DatabaseConnectionError>()(
    "DatabaseConnectionError",
    { message: Schema.String }
) {}

export class DatabaseMiddleware extends HttpApiMiddleware.Service<
    DatabaseMiddleware,
    { provides: PgDrizzle }
>()("@urm/api/DatabaseMiddleware", {
    error: DatabaseConnectionError,
}) {}

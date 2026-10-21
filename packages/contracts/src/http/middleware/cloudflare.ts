/**
 * # Cloudflare Middleware
 *
 * Provides CloudflareBindings (env, ctx) to HTTP handlers; the app supplies the
 * implementation via Layer. Both fields are `unknown`, which keeps drizzle-orm
 * and the workers types out of this package and pushes narrowing to every call
 * site.
 *
 * Currently unapplied. Based on
 * https://github.com/backpine/effect-worker-mono
 */

import { HttpApiMiddleware } from "effect/unstable/httpapi"
import { Context, Schema } from "effect"

export type CloudflareBindingsType = Readonly<{
    env: unknown
    ctx: unknown
}>

export class CloudflareBindings extends Context.Service<
    CloudflareBindings,
    CloudflareBindingsType
>()("CloudflareBindings") {}

export class CloudflareBindingsError extends Schema.TaggedError<CloudflareBindingsError>()(
    "CloudflareBindingsError",
    { message: Schema.String }
) {}

export class CloudflareBindingsMiddleware extends HttpApiMiddleware.Service<
    CloudflareBindingsMiddleware,
    { provides: CloudflareBindings }
>()("@urm/api/CloudflareBindingsMiddleware", {
    error: CloudflareBindingsError,
}) {}

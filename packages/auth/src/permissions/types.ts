/**
 * # Permissions Types
 *
 * Authorization error classes and the (unused) ABAC permission matrix shape.
 */
import * as Schema from "effect/Schema"

export type PermissionMatrix = Record<string, Set<string>>

export class UnauthorizedError extends Schema.TaggedError<UnauthorizedError>()(
    "UnauthorizedError",
    {
        message: Schema.String,
    }
) {}

export class ForbiddenError extends Schema.TaggedError<ForbiddenError>()(
    "ForbiddenError",
    {
        message: Schema.String,
    }
) {}

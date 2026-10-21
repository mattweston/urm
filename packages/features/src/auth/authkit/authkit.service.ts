import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"

import type { Profile } from "./authkit.model.ts"

export class OperationError extends Schema.TaggedError<OperationError>()(
    "AuthKit.OperationError",
    { operation: Schema.String, cause: Schema.Defect() }
) {}

export interface Interface {
    readonly load: () => Effect.Effect<Option.Option<Profile>, OperationError>
    readonly sign_in: () => Effect.Effect<void, OperationError>
    readonly sign_out: () => Effect.Effect<void, OperationError>
}

export class Service extends Context.Service<Service, Interface>()(
    "@urm/features/AuthKit"
) {}

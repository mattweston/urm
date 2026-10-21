import * as AuthKit from "@urm/features/auth/authkit"
import { Effect, Layer, Option } from "effect"

const unavailable = (operation: string) =>
    Effect.fail(
        new AuthKit.OperationError({
            operation,
            cause: new Error("Use the account session for this origin."),
        })
    )

export const layer = Layer.succeed(
    AuthKit.Service,
    AuthKit.Service.of({
        load: () => Effect.succeed(Option.none()),
        sign_in: () => unavailable("sign_in"),
        sign_out: () => unavailable("sign_out"),
    })
)

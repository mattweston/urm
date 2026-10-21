import { Effect, Layer, Schema } from "effect"
import { DatabaseLive } from "@urm/db"
import { SqlLive } from "@urm/db/sql"
import { provision_account } from "@urm/auth"
import { read_account_input } from "./account-input.ts"
import { provision_error_message } from "./provision-error.ts"

class CommandError extends Schema.TaggedError<CommandError>()(
    "CommandError",
    { message: Schema.String }
) {}

const input = await read_account_input(true)
const result = await Effect.runPromise(
    provision_account(input).pipe(
        Effect.provide(SqlLive.pipe(Layer.provide(DatabaseLive))),
        Effect.catch((error) =>
            Effect.fail(
                new CommandError({
                    message: provision_error_message(error),
                })
            )
        )
    )
)
console.log(JSON.stringify(result, null, 4))

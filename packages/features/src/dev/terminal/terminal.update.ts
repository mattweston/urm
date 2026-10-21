import { Match as M } from "effect"
import { modifyFields } from "foldkit/struct"
import type { Message } from "./terminal.message.ts"
import type { Model } from "./terminal.model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<never>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const init = (): UpdateReturn => [{ query: "" }, []]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            UpdatedTerminalSearchQuery: ({ value }) => [
                modifyFields(model, { query: () => value }),
                [],
            ],
        })
    )

import { Match as M } from "effect"
import type { Command } from "foldkit"
import { modifyFields } from "foldkit/struct"

import type { Message } from "./message.ts"
import type { Model } from "./model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const init = (): UpdateReturn => [{ search: "" }, []]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            ChangedSearchInput: ({ value }) => [
                modifyFields(model, { search: () => value }),
                [],
            ],
            ClickedClearSearch: () => [modifyFields(model, { search: () => "" }), []],
        })
    )

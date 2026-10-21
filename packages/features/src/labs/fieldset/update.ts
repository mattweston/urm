import { Match as M } from "effect"
import { Command } from "foldkit"
import { modifyFields } from "foldkit/struct"

import type { Message } from "./message.ts"
import type { Model } from "./model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const init = (): UpdateReturn => [
    { checkbox: false, inputValue: "", textareaValue: "" },
    [],
]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            ToggledCheckbox: ({ isChecked }) => [
                modifyFields(model, { checkbox: () => isChecked }),
                [],
            ],
            UpdatedInputValue: ({ value }) => [
                modifyFields(model, { inputValue: () => value }),
                [],
            ],
            UpdatedTextareaValue: ({ value }) => [
                modifyFields(model, { textareaValue: () => value }),
                [],
            ],
        })
    )

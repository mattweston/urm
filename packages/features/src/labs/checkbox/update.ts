import { Match as M } from "effect"
import { Command } from "foldkit"
import { modifyFields } from "foldkit/struct"

import type { Message } from "./message.ts"
import type { Model } from "./model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            ToggledBasic: ({ isChecked }) => [
                modifyFields(model, { basic: () => isChecked }),
                [],
            ],
            ToggledAll: ({ isChecked }) => [
                modifyFields(model, {
                    optionA: () => isChecked,
                    optionB: () => isChecked,
                }),
                [],
            ],
            ToggledOptionA: ({ isChecked }) => [
                modifyFields(model, { optionA: () => isChecked }),
                [],
            ],
            ToggledOptionB: ({ isChecked }) => [
                modifyFields(model, { optionB: () => isChecked }),
                [],
            ],
        })
    )

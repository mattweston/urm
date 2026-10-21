import { Match as M } from "effect"
import { Command } from "foldkit"
import { evo } from "foldkit/struct"

import type { Message } from "./message.ts"
import type { Model } from "./model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            ToggledCheckbox: ({ isChecked }) => [
                evo(model, { checkbox: () => isChecked }),
                [],
            ],
            ToggledNot: ({ isChecked }) => [
                evo(model, { not: () => isChecked }),
                [],
            ],
            ToggledOperandA: ({ isChecked }) => [
                evo(model, { operandA: () => isChecked }),
                [],
            ],
            ToggledOperandB: ({ isChecked }) => [
                evo(model, { operandB: () => isChecked }),
                [],
            ],
            ToggledListA: ({ isChecked }) => [
                evo(model, { listA: () => isChecked }),
                [],
            ],
            ToggledListB: ({ isChecked }) => [
                evo(model, { listB: () => isChecked }),
                [],
            ],
            ToggledListC: ({ isChecked }) => [
                evo(model, { listC: () => isChecked }),
                [],
            ],
        })
    )

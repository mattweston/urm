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
            ToggledCheckbox: ({ isChecked }) => [
                modifyFields(model, { checkbox: () => isChecked }),
                [],
            ],
            ToggledNot: ({ isChecked }) => [
                modifyFields(model, { not: () => isChecked }),
                [],
            ],
            ToggledOperandA: ({ isChecked }) => [
                modifyFields(model, { operandA: () => isChecked }),
                [],
            ],
            ToggledOperandB: ({ isChecked }) => [
                modifyFields(model, { operandB: () => isChecked }),
                [],
            ],
            ToggledListA: ({ isChecked }) => [
                modifyFields(model, { listA: () => isChecked }),
                [],
            ],
            ToggledListB: ({ isChecked }) => [
                modifyFields(model, { listB: () => isChecked }),
                [],
            ],
            ToggledListC: ({ isChecked }) => [
                modifyFields(model, { listC: () => isChecked }),
                [],
            ],
        })
    )

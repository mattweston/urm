import { Match as M } from "effect"
import { Command } from "foldkit"
import { modifyFields } from "foldkit/struct"

import type { Message } from "./message.ts"
import { initialModel, type Model } from "./model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const init = (): UpdateReturn => [initialModel, []]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            UpdatedName: ({ value }) => [modifyFields(model, { name: () => value }), []],
            UpdatedEmail: ({ value }) => [
                modifyFields(model, { email: () => value }),
                [],
            ],
            SubmittedForm: () => [
                modifyFields(model, {
                    submitted: () => ({ name: model.name, email: model.email }),
                }),
                [],
            ],
        })
    )

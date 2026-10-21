import { Match as M } from "effect"
import { Command } from "foldkit"
import { Option } from "effect"
import { evo } from "foldkit/struct"

import { type Message } from "./app.message.ts"
import type { Model } from "./app.model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const init = (): UpdateReturn => [
    {
        selectedTemplateId: Option.none(),
    },
    [],
]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            SelectedTemplateChanged: ({ templateId }) => [
                evo(model, {
                    selectedTemplateId: () => Option.some(templateId),
                }),
                [],
            ],
            ClosedTemplatePreview: () => [
                evo(model, {
                    selectedTemplateId: () => Option.none(),
                }),
                [],
            ],
        })
    )

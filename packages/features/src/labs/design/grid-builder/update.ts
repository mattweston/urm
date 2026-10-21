import { Match as M } from "effect"
import { Command } from "foldkit"
import { evo } from "foldkit/struct"

import type { Message } from "./message.ts"
import { initial_model, type Model } from "./model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const init = (): UpdateReturn => [initial_model, []]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            ClickedAddBox: () => [
                evo(model, {
                    box_count: (box_count) => Math.min(12, box_count + 1),
                }),
                [],
            ],
            ClickedRemoveBox: () => [
                evo(model, {
                    box_count: (box_count) => Math.max(1, box_count - 1),
                }),
                [],
            ],
            SelectedPreviewShape: ({ preview_shape }) => [
                evo(model, { preview_shape: () => preview_shape }),
                [],
            ],
        })
    )

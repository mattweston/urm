import { Match as M } from "effect"
import { Command } from "foldkit"
import { modifyFields } from "foldkit/struct"

import type { Message } from "./message.ts"
import { initial_model, type Model } from "./model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const init = (): UpdateReturn => [initial_model, []]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            ClickedAddBox: () => [
                modifyFields(model, {
                    box_count: (box_count) => Math.min(12, box_count + 1),
                }),
                [],
            ],
            ClickedRemoveBox: () => [
                modifyFields(model, {
                    box_count: (box_count) => Math.max(1, box_count - 1),
                }),
                [],
            ],
            SelectedPreviewShape: ({ preview_shape }) => [
                modifyFields(model, { preview_shape: () => preview_shape }),
                [],
            ],
        })
    )

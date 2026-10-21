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
            ChangedFlexDirection: ({ value }) => [
                modifyFields(model, { flexDirection: () => value }),
                [],
            ],
            ChangedJustifyContent: ({ value }) => [
                modifyFields(model, { justifyContent: () => value }),
                [],
            ],
            ChangedAlignItems: ({ value }) => [
                modifyFields(model, { alignItems: () => value }),
                [],
            ],
            ToggledUnevenChildren: ({ isUneven }) => [
                modifyFields(model, { unevenChildren: () => isUneven }),
                [],
            ],
        })
    )

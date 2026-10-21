import { Match as M } from "effect"
import { modifyFields } from "foldkit/struct"

import type { WebComponentsMessage } from "./message.ts"
import type { Model } from "./model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<never>]

export const update = (
    model: Model,
    message: WebComponentsMessage
): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            UpdatedWebComponentLabel: ({ value }) => [
                modifyFields(model, { label: () => value }),
                [],
            ],
            ChangedWebComponentRating: ({ rating }) => [
                modifyFields(model, { rating: () => rating }),
                [],
            ],
            ChangedWebComponentAccent: ({ accent }) => [
                modifyFields(model, { accent: () => accent }),
                [],
            ],
        })
    )

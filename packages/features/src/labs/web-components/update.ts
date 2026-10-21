import { Match as M } from "effect"
import { evo } from "foldkit/struct"

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
                evo(model, { label: () => value }),
                [],
            ],
            ChangedWebComponentRating: ({ rating }) => [
                evo(model, { rating: () => rating }),
                [],
            ],
            ChangedWebComponentAccent: ({ accent }) => [
                evo(model, { accent: () => accent }),
                [],
            ],
        })
    )

import { Match as M, Option } from "effect"
import { evo } from "foldkit/struct"

import type { ViewTransitionsMessage } from "./message.ts"
import type { Model } from "./model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<never>]

export const update = (
    model: Model,
    message: ViewTransitionsMessage
): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            // Navigating back to the gallery clears the food slug but keeps the
            // active one, so the gallery can still match the card the incoming
            // transition animates from.
            ChangedViewTransitionsRoute: ({ maybeFoodSlug }) => [
                evo(model, {
                    maybeFoodSlug: () => maybeFoodSlug,
                    maybeActiveFoodSlug: (activeFoodSlug) =>
                        Option.orElse(maybeFoodSlug, () => activeFoodSlug),
                }),
                [],
            ],
            FocusedViewTransitionsFood: ({ foodSlug }) => [
                evo(model, {
                    maybeActiveFoodSlug: () => Option.some(foodSlug),
                }),
                [],
            ],
            UpdatedViewTransitionsFilterText: ({ filterText }) => [
                evo(model, { filterText: () => filterText }),
                [],
            ],
        })
    )

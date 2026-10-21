import { Match as M } from "effect"
import { evo } from "foldkit/struct"
import type { Message } from "./bookmarks.message.ts"
import type { Model } from "./bookmarks.model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<never>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const init = (): UpdateReturn => [
    {
        query: "",
    },
    [],
]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            UpdatedBookmarkSearchQuery: ({ value }) => [
                evo(model, {
                    query: () => value,
                }),
                [],
            ],
        })
    )

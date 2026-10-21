import { Match as M } from "effect"
import { evo } from "foldkit/struct"

import type { Message } from "./message.ts"
import type { Model } from "./model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<never>]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            SelectedGalleryImage: ({ id }) => [
                evo(model, { selected_image_id: () => id }),
                [],
            ],
            ClosedGalleryImage: () => [
                evo(model, { selected_image_id: () => null }),
                [],
            ],
            CompletedGalleryMasonry: () => [model, []],
        })
    )

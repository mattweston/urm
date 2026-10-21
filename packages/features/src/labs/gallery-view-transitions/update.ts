import { Match as M } from "effect"
import { modifyFields } from "foldkit/struct"

import type { Message } from "./message.ts"
import type { Model } from "./model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<never>]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            SelectedGalleryImage: ({ id }) => [
                modifyFields(model, { selected_image_id: () => id }),
                [],
            ],
            ClosedGalleryImage: () => [
                modifyFields(model, { selected_image_id: () => null }),
                [],
            ],
            CompletedGalleryMasonry: () => [model, []],
        })
    )

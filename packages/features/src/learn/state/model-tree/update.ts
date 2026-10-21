import { Match as M } from "effect"
import type { Update } from "foldkit"
import { evo } from "foldkit/struct"

import type { Message } from "./message.ts"
import { type Model } from "./model.ts"

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            SelectedModelTreeFocus: ({ focus }) => ({
                model: evo(model, { focus: () => focus }),
                commands: [],
            }),
        })
    )

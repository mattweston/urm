import { Match as M } from "effect"
import { Command } from "foldkit"
import { modifyFields } from "foldkit/struct"

import { payment_total } from "./payment-fold.data.ts"
import type { Message } from "./payment-fold.message.ts"
import type { Model } from "./payment-fold.model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            ClickedRunFold: () => [
                modifyFields(model, {
                    isSummarized: () => true,
                    total: () => payment_total,
                }),
                [],
            ],
            ClickedReset: () => [
                modifyFields(model, {
                    isSummarized: () => false,
                    total: () => 0,
                }),
                [],
            ],
        })
    )

export const init = (): UpdateReturn => [{ isSummarized: false, total: 0 }, []]

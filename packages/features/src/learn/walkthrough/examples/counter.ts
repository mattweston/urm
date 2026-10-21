import { Match as M, Schema as S } from "effect"
import type { Update } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"

export const Model = S.Struct({ count: S.Number })
export type Model = typeof Model.Type

export const ClickedDecreaseCount = taggedStruct("ClickedDecreaseCount")
export const ClickedResetCount = taggedStruct("ClickedResetCount")
export const ClickedIncreaseCount = taggedStruct("ClickedIncreaseCount")
export const Message = S.Union([
    ClickedDecreaseCount,
    ClickedResetCount,
    ClickedIncreaseCount,
])
export type Message = typeof Message.Type

export const init: Model = Model.make({ count: 0 })

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            ClickedDecreaseCount: () => ({
                model: modifyFields(model, { count: (count) => count - 1 }),
                commands: [],
            }),
            ClickedResetCount: () => ({
                model: modifyFields(model, { count: () => 0 }),
                commands: [],
            }),
            ClickedIncreaseCount: () => ({
                model: modifyFields(model, { count: (count) => count + 1 }),
                commands: [],
            }),
        })
    )

export const doubled = ({ count }: Model): number => count * 2

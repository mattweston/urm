import { Array, Match as M, Schema as S } from "effect"
import type { Update } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { evo } from "foldkit/struct"

const MINIMUM_REPEAT_COUNT = 1
const MAXIMUM_REPEAT_COUNT = 10

export const Model = S.Struct({ text: S.String, repeat_count: S.Number })
export type Model = typeof Model.Type

export const UpdatedRepeatedText = taggedStruct("UpdatedRepeatedText", {
    value: S.String,
})
export const ClickedDecreaseRepeatCount = taggedStruct(
    "ClickedDecreaseRepeatCount"
)
export const ClickedResetRepeatCount = taggedStruct("ClickedResetRepeatCount")
export const ClickedIncreaseRepeatCount = taggedStruct(
    "ClickedIncreaseRepeatCount"
)
export const Message = S.Union([
    UpdatedRepeatedText,
    ClickedDecreaseRepeatCount,
    ClickedResetRepeatCount,
    ClickedIncreaseRepeatCount,
])
export type Message = typeof Message.Type

export const init: Model = Model.make({ text: "Effect", repeat_count: 3 })

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            UpdatedRepeatedText: ({ value }) => ({
                model: evo(model, { text: () => value }),
                commands: [],
            }),
            ClickedDecreaseRepeatCount: () => ({
                model: evo(model, {
                    repeat_count: (count) =>
                        Math.max(MINIMUM_REPEAT_COUNT, count - 1),
                }),
                commands: [],
            }),
            ClickedResetRepeatCount: () => ({
                model: evo(model, { repeat_count: () => MINIMUM_REPEAT_COUNT }),
                commands: [],
            }),
            ClickedIncreaseRepeatCount: () => ({
                model: evo(model, {
                    repeat_count: (count) =>
                        Math.min(MAXIMUM_REPEAT_COUNT, count + 1),
                }),
                commands: [],
            }),
        })
    )

export const repeated = (model: Model): string =>
    Array.makeBy(model.repeat_count, () => model.text).join(" ")

export const isAtMinimum = ({ repeat_count }: Model): boolean =>
    repeat_count <= MINIMUM_REPEAT_COUNT

export const isAtMaximum = ({ repeat_count }: Model): boolean =>
    repeat_count >= MAXIMUM_REPEAT_COUNT

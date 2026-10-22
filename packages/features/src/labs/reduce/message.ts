import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const ChangedPrice = taggedStruct("ChangedPrice", {
    index: S.Number,
    value: S.String,
})

export const SubmittedReduce = taggedStruct("SubmittedReduce")

export const Message = S.Union([ChangedPrice, SubmittedReduce])

export type Message = typeof Message.Type

import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const ChangedSearchInput = taggedStruct("ChangedSearchInput", {
    value: S.String,
})
export const ClickedClearSearch = taggedStruct("ClickedClearSearch")

export const Message = S.Union([ChangedSearchInput, ClickedClearSearch])

export type Message = typeof Message.Type

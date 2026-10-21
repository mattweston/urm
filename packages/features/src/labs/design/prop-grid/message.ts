import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

import { JustifyItems } from "./model.ts"

export const SelectedJustifyItems = taggedStruct("SelectedJustifyItems", {
    justify_items: JustifyItems,
})

export const Message = S.Union([SelectedJustifyItems])
export type Message = typeof Message.Type

import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

import { Focus } from "./model.ts"

export const SelectedFocus = taggedStruct("SelectedModelTreeFocus", {
    focus: Focus,
})

export const Message = S.Union([SelectedFocus])
export type Message = typeof Message.Type

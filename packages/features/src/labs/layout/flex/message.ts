import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

import { AlignItems, FlexDirection, JustifyContent } from "./flex.ts"

export const ChangedFlexDirection = taggedStruct("ChangedFlexDirection", {
    value: FlexDirection,
})
export const ChangedJustifyContent = taggedStruct("ChangedJustifyContent", {
    value: JustifyContent,
})
export const ChangedAlignItems = taggedStruct("ChangedAlignItems", {
    value: AlignItems,
})
export const ToggledUnevenChildren = taggedStruct("ToggledUnevenChildren", {
    isUneven: S.Boolean,
})

export const Message = S.Union([
    ChangedFlexDirection,
    ChangedJustifyContent,
    ChangedAlignItems,
    ToggledUnevenChildren,
])
export type Message = typeof Message.Type

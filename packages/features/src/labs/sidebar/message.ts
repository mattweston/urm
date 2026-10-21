import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const ToggledIsCollapsed = taggedStruct("ToggledIsCollapsed")
export const ToggledMobileIsOpen = taggedStruct("ToggledMobileIsOpen")

export const Message = S.Union([ToggledIsCollapsed, ToggledMobileIsOpen])
export type Message = typeof Message.Type

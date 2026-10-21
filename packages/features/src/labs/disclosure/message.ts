import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const ToggledOpen = taggedStruct("ToggledOpen", { isOpen: S.Boolean })

export const Message = S.Union([ToggledOpen])
export type Message = typeof Message.Type

import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const CompletedResizableMount = taggedStruct("CompletedResizableMount")

export const Message = S.Union([CompletedResizableMount])

export type Message = typeof Message.Type

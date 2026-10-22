import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const UpdatedTerminalSearchQuery = taggedStruct(
    "UpdatedTerminalSearchQuery",
    {
        value: S.String,
    }
)
export const Message = S.Union([UpdatedTerminalSearchQuery])
export type Message = typeof Message.Type

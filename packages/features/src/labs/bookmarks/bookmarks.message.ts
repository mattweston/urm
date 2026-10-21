import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const UpdatedBookmarkSearchQuery = taggedStruct(
    "UpdatedBookmarkSearchQuery",
    {
        value: S.String,
    }
)

export const Message = S.Union([UpdatedBookmarkSearchQuery])

export type Message = typeof Message.Type

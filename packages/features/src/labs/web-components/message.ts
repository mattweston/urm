import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const UpdatedWebComponentLabel = taggedStruct(
    "UpdatedWebComponentLabel",
    {
        value: S.String,
    }
)
export const ChangedWebComponentRating = taggedStruct(
    "ChangedWebComponentRating",
    {
        rating: S.Number,
    }
)
export const ChangedWebComponentAccent = taggedStruct(
    "ChangedWebComponentAccent",
    {
        accent: S.String,
    }
)

export const WebComponentsMessage = S.Union([
    UpdatedWebComponentLabel,
    ChangedWebComponentRating,
    ChangedWebComponentAccent,
])
export type WebComponentsMessage = typeof WebComponentsMessage.Type

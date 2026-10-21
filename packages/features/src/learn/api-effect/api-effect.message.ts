import { Schema } from "effect"
import { taggedStruct } from "foldkit/schema"
import { Character } from "./model.ts"

export const UpdatedCharacterId = taggedStruct("UpdatedCharacterId", {
    value: Schema.String,
})
export const SelectedCharacterId = taggedStruct("SelectedCharacterId", {
    value: Schema.String,
})
export const SubmittedCharacter = taggedStruct("SubmittedCharacter")
export const SucceededFetchCharacter = taggedStruct("SucceededFetchCharacter", {
    character: Character,
})
export const LostConnection = taggedStruct("LostConnection", {
    detail: Schema.String,
})
export const MissingCharacter = taggedStruct("MissingCharacter", {
    detail: Schema.String,
})
export const InvalidCharacterResponse = taggedStruct(
    "InvalidCharacterResponse",
    {
        detail: Schema.String,
    }
)

export const Message = Schema.Union([
    UpdatedCharacterId,
    SelectedCharacterId,
    SubmittedCharacter,
    SucceededFetchCharacter,
    LostConnection,
    MissingCharacter,
    InvalidCharacterResponse,
])

export type Message = typeof Message.Type

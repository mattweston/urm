import { Effect, Schema, Schema as S } from "effect"
import { Command } from "foldkit"
import { layer, RickAndMortyApi } from "./api.ts"
import {
    InvalidCharacterResponse,
    LostConnection,
    MissingCharacter,
    SucceededFetchCharacter,
} from "./api-effect.message.ts"

const FetchCharacter = Command.define("FetchCharacter", {
    args: { character_id: S.String },
    messages: [
        SucceededFetchCharacter,
        Schema.Union([
            LostConnection,
            MissingCharacter,
            InvalidCharacterResponse,
        ]),
    ],
    execute: ({ character_id }) =>
        Effect.gen(function* () {
            const api = yield* RickAndMortyApi
            const character = yield* api.getCharacter(character_id)
            return SucceededFetchCharacter({ character })
        }).pipe(
            Effect.catchTag("RickAndMortyApi.ConnectionLost", ({ message }) =>
                Effect.succeed(LostConnection({ detail: message }))
            ),
            Effect.catchTag(
                "RickAndMortyApi.CharacterNotFound",
                ({ message }) =>
                    Effect.succeed(MissingCharacter({ detail: message }))
            ),
            Effect.catchTag(
                "RickAndMortyApi.InvalidCharacterPayload",
                ({ message }) =>
                    Effect.succeed(
                        InvalidCharacterResponse({ detail: message })
                    )
            ),
            Effect.provide(layer)
        ),
})

export const fetchCharacter = (character_id: string) =>
    FetchCharacter({ character_id })

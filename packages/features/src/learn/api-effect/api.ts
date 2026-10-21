import { Context, Effect, Layer, Schema } from "effect"
import {
    FetchHttpClient,
    HttpClient,
    HttpClientRequest,
} from "effect/http"
import type { Character } from "./model.ts"

const RickAndMortyCharacter = Schema.Struct({
    id: Schema.Number,
    name: Schema.String,
    status: Schema.String,
    species: Schema.String,
    origin: Schema.Struct({ name: Schema.String }),
    image: Schema.String,
})

class ConnectionLost extends Schema.TaggedError<ConnectionLost>()(
    "RickAndMortyApi.ConnectionLost",
    { message: Schema.String }
) {}

class CharacterNotFound extends Schema.TaggedError<CharacterNotFound>()(
    "RickAndMortyApi.CharacterNotFound",
    { message: Schema.String }
) {}

class InvalidCharacterPayload extends Schema.TaggedError<InvalidCharacterPayload>()(
    "RickAndMortyApi.InvalidCharacterPayload",
    { message: Schema.String }
) {}

interface RickAndMortyApiShape {
    readonly getCharacter: (
        character_id: string
    ) => Effect.Effect<
        Character,
        ConnectionLost | CharacterNotFound | InvalidCharacterPayload
    >
}

export class RickAndMortyApi extends Context.Service<
    RickAndMortyApi,
    RickAndMortyApiShape
>()("@urm/design/RickAndMortyApi") {}

const randomConnectionLoss = () => Math.random() < 0.35

export const layer = Layer.effect(
    RickAndMortyApi,
    Effect.gen(function* () {
        const http_client = yield* HttpClient.HttpClient

        const getCharacter = Effect.fn("RickAndMortyApi.getCharacter")(
            function* (character_id: string) {
                if (randomConnectionLoss()) {
                    return yield* Effect.fail(
                        new ConnectionLost({
                            message:
                                "Connection lost before the character service could respond.",
                        })
                    )
                }

                const response = yield* http_client
                    .execute(
                        HttpClientRequest.get(
                            `https://rickandmortyapi.com/api/character/${encodeURIComponent(character_id)}`
                        )
                    )
                    .pipe(
                        Effect.mapError(
                            () =>
                                new ConnectionLost({
                                    message:
                                        "Connection lost while contacting the external character API.",
                                })
                        )
                    )

                if (response.status === 404) {
                    return yield* Effect.fail(
                        new CharacterNotFound({
                            message: `Character ${character_id} does not exist.`,
                        })
                    )
                }

                if (response.status < 200 || response.status >= 300) {
                    return yield* Effect.fail(
                        new ConnectionLost({
                            message: `The external character API returned HTTP ${response.status}.`,
                        })
                    )
                }

                const payload = yield* response.json.pipe(
                    Effect.mapError(
                        () =>
                            new InvalidCharacterPayload({
                                message:
                                    "The character API returned unreadable JSON.",
                            })
                    )
                )
                const character = yield* Schema.decodeUnknownEffect(
                    RickAndMortyCharacter
                )(payload).pipe(
                    Effect.mapError(
                        () =>
                            new InvalidCharacterPayload({
                                message:
                                    "The character API response is missing a required field.",
                            })
                    )
                )

                return {
                    id: character.id,
                    name: character.name,
                    status: character.status,
                    species: character.species,
                    origin_name: character.origin.name,
                    image: character.image,
                }
            }
        )

        return RickAndMortyApi.of({ getCharacter })
    })
).pipe(Layer.provide(FetchHttpClient.layer))

export { CharacterNotFound, ConnectionLost, InvalidCharacterPayload }

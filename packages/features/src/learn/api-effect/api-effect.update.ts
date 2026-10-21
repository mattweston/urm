import { Match } from "effect"
import { Command } from "foldkit"
import { fetchCharacter } from "./api-effect.command.ts"
import type { Message } from "./api-effect.message.ts"
import type { Model } from "./model.ts"
import { initialModel } from "./model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = Match.withReturnType<UpdateReturn>()

export const init = (): UpdateReturn => [initialModel, []]

export const update = (model: Model, message: Message): UpdateReturn =>
    Match.value(message).pipe(
        withUpdateReturn,
        Match.tagsExhaustive({
            UpdatedCharacterId: ({ value }) => [
                { ...model, character_id_input: value },
                [],
            ],
            SelectedCharacterId: ({ value }) => [
                { ...model, character_id_input: value },
                [],
            ],
            SubmittedCharacter: () => [
                { ...model, request: { _tag: "Loading" } },
                [fetchCharacter(model.character_id_input)],
            ],
            SucceededFetchCharacter: ({ character }) => [
                { ...model, request: { _tag: "Success", character } },
                [],
            ],
            LostConnection: ({ detail: message }) => [
                { ...model, request: { _tag: "ConnectionLost", message } },
                [],
            ],
            MissingCharacter: ({ detail: message }) => [
                { ...model, request: { _tag: "CharacterNotFound", message } },
                [],
            ],
            InvalidCharacterResponse: ({ detail: message }) => [
                { ...model, request: { _tag: "InvalidResponse", message } },
                [],
            ],
        })
    )

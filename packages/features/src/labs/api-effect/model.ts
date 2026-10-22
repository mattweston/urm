import { Schema } from "effect"

export const Character = Schema.Struct({
    id: Schema.Number,
    name: Schema.String,
    status: Schema.String,
    species: Schema.String,
    origin_name: Schema.String,
    image: Schema.String,
})

export type Character = typeof Character.Type

export const RequestState = Schema.TaggedUnion({
    Idle: {},
    Loading: {},
    Success: { character: Character },
    ConnectionLost: { message: Schema.String },
    CharacterNotFound: { message: Schema.String },
    InvalidResponse: { message: Schema.String },
})

export type RequestState = typeof RequestState.Type

export const Model = Schema.Struct({
    character_id_input: Schema.String,
    request: RequestState,
})

export type Model = typeof Model.Type

export const initialModel: Model = {
    character_id_input: "1",
    request: { _tag: "Idle" },
}

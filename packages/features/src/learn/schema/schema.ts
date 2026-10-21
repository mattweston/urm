import { Match as M, Result, Schema as S } from "effect"
import type { Update } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Real Effect 4 Schema examples
// -----------------------------------------------------------------------------

export const Role = S.Literals(["admin", "member"])

export const UserWire = S.Struct({
    id: S.String,
    name: S.Trim,
    age: S.FiniteFromString,
    role: Role,
    email: S.optionalKey(S.String),
})

export type User = typeof UserWire.Type
export type UserEncoded = S.Codec.Encoded<typeof UserWire>

export const valid_wire_user: UserEncoded = {
    id: "u-42",
    name: "  Ada Lovelace  ",
    age: "36",
    role: "admin",
    email: "ada@example.com",
}

export const decoded_user = S.decodeResult(UserWire)(valid_wire_user)

export const domain_user: User = {
    id: "u-42",
    name: "Ada Lovelace",
    age: 36,
    role: "admin",
    email: "ada@example.com",
}

export const encoded_user = S.encodeResult(UserWire)(domain_user)

// NumberFromString is intentionally permissive: JS number coercion can
// produce NaN / Infinity. FiniteFromString adds the finite-number check.
export const permissive_number = S.decodeResult(S.NumberFromString)(
    "not-a-number"
)

export const finite_number = S.decodeResult(S.FiniteFromString)("not-a-number")

// Struct + Union/Literals gives ordinary inferred TypeScript types.
export const Event = S.Union([
    S.Struct({
        type: S.Literal("UserCreated"),
        user: UserWire,
    }),
    S.Struct({
        type: S.Literal("UserDeleted"),
        id: S.String,
    }),
])

export type Event = typeof Event.Type

// -----------------------------------------------------------------------------
// Visual teaching model
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Shape"),
    S.Literal("Decode"),
    S.Literal("Transform"),
    S.Literal("Encode"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Shape",
    "Decode",
    "Transform",
    "Encode",
]

export const DecodeCase = S.Union([
    S.Literal("Valid"),
    S.Literal("BadAge"),
    S.Literal("BadRole"),
    S.Literal("MissingName"),
])
export type DecodeCase = typeof DecodeCase.Type

export const NumberCodec = S.Union([
    S.Literal("NumberFromString"),
    S.Literal("FiniteFromString"),
])
export type NumberCodec = typeof NumberCodec.Type

export const Model = S.Struct({
    stage: Stage,

    shape_show_type: S.Boolean,

    decode_case: DecodeCase,

    number_codec: NumberCodec,
    transform_input: S.String,

    encode_has_email: S.Boolean,
})
export type Model = typeof Model.Type

export const SelectedSchemaStage = taggedStruct("SelectedSchemaStage", {
    stage: Stage,
})

export const ToggledSchemaType = taggedStruct("ToggledSchemaType")

export const SelectedSchemaDecodeCase = taggedStruct(
    "SelectedSchemaDecodeCase",
    { decode_case: DecodeCase }
)

export const SelectedNumberCodec = taggedStruct("SelectedNumberCodec", {
    number_codec: NumberCodec,
})
export const UpdatedSchemaTransformInput = taggedStruct(
    "UpdatedSchemaTransformInput",
    { value: S.String }
)

export const ToggledSchemaEncodeEmail = taggedStruct("ToggledSchemaEncodeEmail")

export const Message = S.Union([
    SelectedSchemaStage,

    ToggledSchemaType,

    SelectedSchemaDecodeCase,

    SelectedNumberCodec,
    UpdatedSchemaTransformInput,

    ToggledSchemaEncodeEmail,
])
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Shape",

    shape_show_type: true,

    decode_case: "Valid",

    number_codec: "FiniteFromString",
    transform_input: "36",

    encode_has_email: true,
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            SelectedSchemaStage: ({ stage }) => ({
                model: evo(model, { stage: () => stage }),
                commands: [],
            }),

            ToggledSchemaType: () => ({
                model: evo(model, {
                    shape_show_type: (value) => !value,
                }),
                commands: [],
            }),

            SelectedSchemaDecodeCase: ({ decode_case }) => ({
                model: evo(model, {
                    decode_case: () => decode_case,
                }),
                commands: [],
            }),

            SelectedNumberCodec: ({ number_codec }) => ({
                model: evo(model, {
                    number_codec: () => number_codec,
                }),
                commands: [],
            }),

            UpdatedSchemaTransformInput: ({ value }) => ({
                model: evo(model, {
                    transform_input: () => value,
                }),
                commands: [],
            }),

            ToggledSchemaEncodeEmail: () => ({
                model: evo(model, {
                    encode_has_email: (value) => !value,
                }),
                commands: [],
            }),
        })
    )

export const decode_input = (decode_case: DecodeCase): unknown => {
    switch (decode_case) {
        case "Valid":
            return {
                id: "u-42",
                name: "  Ada Lovelace  ",
                age: "36",
                role: "admin",
                email: "ada@example.com",
            }
        case "BadAge":
            return {
                id: "u-42",
                name: "Ada Lovelace",
                age: "not-a-number",
                role: "admin",
            }
        case "BadRole":
            return {
                id: "u-42",
                name: "Ada Lovelace",
                age: "36",
                role: "owner",
            }
        case "MissingName":
            return {
                id: "u-42",
                age: "36",
                role: "member",
            }
    }
}

export const decode_result = (decode_case: DecodeCase) =>
    S.decodeUnknownResult(UserWire)(decode_input(decode_case))

export const schema_error_summary = (
    result: ReturnType<typeof decode_result>
): string =>
    Result.match(result, {
        onSuccess: () => "Decoded successfully.",
        onFailure: (error) => String(error),
    })

export const number_codec_result = (model: Model) =>
    model.number_codec === "NumberFromString"
        ? S.decodeResult(S.NumberFromString)(model.transform_input)
        : S.decodeResult(S.FiniteFromString)(model.transform_input)

export const encode_domain_value = (has_email: boolean): User => ({
    id: "u-42",
    name: "Ada Lovelace",
    age: 36,
    role: "admin",
    ...(has_email ? { email: "ada@example.com" } : {}),
})

export const encode_result = (has_email: boolean) =>
    S.encodeResult(UserWire)(encode_domain_value(has_email))

export const result_label = <A, E>(result: Result.Result<A, E>): string =>
    Result.match(result, {
        onSuccess: (value) => `Success(${JSON.stringify(value)})`,
        onFailure: (error) => `Failure(${String(error)})`,
    })

import { Channel, ChannelSchema, Schema as S } from "effect"
import type { Array as Arr } from "effect"
import type { Update as FoldkitUpdate } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Real Effect 4 ChannelSchema examples
// -----------------------------------------------------------------------------

// Type = number
// Encoded = string
export const NumberFromString = S.NumberFromString

// Typed encoded boundary:
// NonEmptyReadonlyArray<string>
//   →
// NonEmptyReadonlyArray<number>
export const decodeNumbers = ChannelSchema.decode(NumberFromString)()

// Unknown encoded boundary:
// NonEmptyReadonlyArray<unknown>
//   →
// NonEmptyReadonlyArray<number>
export const decodeUnknownNumbers =
    ChannelSchema.decodeUnknown(NumberFromString)()

// Typed application values:
// NonEmptyReadonlyArray<number>
//   →
// NonEmptyReadonlyArray<string>
export const encodeNumbers = ChannelSchema.encode(NumberFromString)()

// Same runtime encoder, but the output side is intentionally typed unknown.
export const encodeUnknownNumbers =
    ChannelSchema.encodeUnknown(NumberFromString)()

// Concrete decode pipeline.
export const encodedChunks: ReadonlyArray<Arr.NonEmptyReadonlyArray<string>> = [
    ["1", "2"],
    ["3"],
]

export const encodedSource = Channel.fromArray(encodedChunks)

export const decodedPipeline = Channel.pipeTo(encodedSource, decodeNumbers)

// Concrete encode pipeline.
export const typedChunks: ReadonlyArray<Arr.NonEmptyReadonlyArray<number>> = [
    [1, 2],
    [3],
]

export const typedSource = Channel.fromArray(typedChunks)

export const encodedPipeline = Channel.pipeTo(typedSource, encodeNumbers)

// Invalid encoded values are still statically strings, but decoding fails at
// runtime with SchemaError.
export const invalidEncodedChunks: ReadonlyArray<
    Arr.NonEmptyReadonlyArray<string>
> = [["1", "oops", "3"]]

export const invalidDecodedPipeline = Channel.pipeTo(
    Channel.fromArray(invalidEncodedChunks),
    ChannelSchema.decode(NumberFromString, {
        errors: "all",
    })()
)

// -----------------------------------------------------------------------------
// Duplex: expose typed input/output around a channel that speaks encoded data
// internally.
// -----------------------------------------------------------------------------

export const encodedEcho = Channel.identity<
    Arr.NonEmptyReadonlyArray<string>,
    S.SchemaError,
    void
>()

export const typedEcho = ChannelSchema.duplex(encodedEcho, {
    inputSchema: NumberFromString,
    outputSchema: NumberFromString,
})

// Caller-facing protocol of typedEcho:
//
// InElem  = NonEmptyReadonlyArray<number>
// OutElem = NonEmptyReadonlyArray<number>
//
// Internally encodedEcho still sees:
//
// InElem  = NonEmptyReadonlyArray<string>
// OutElem = NonEmptyReadonlyArray<string>
//
// Flow:
//
// number[] -- encode --> string[] -- inner channel --> string[] -- decode --> number[]

// -----------------------------------------------------------------------------
// Teaching demo
// -----------------------------------------------------------------------------

export const Stage = S.Literals(["Decode", "Encode", "Duplex", "Boundary"])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Decode",
    "Encode",
    "Duplex",
    "Boundary",
]

export const DecodeMode = S.Literals(["Typed", "Unknown", "Invalid"])
export type DecodeMode = typeof DecodeMode.Type

export const EncodeMode = S.Literals(["Typed", "Unknown"])
export type EncodeMode = typeof EncodeMode.Type

export const BoundaryMode = S.Literals([
    "Types",
    "Errors",
    "Options",
    "Services",
])
export type BoundaryMode = typeof BoundaryMode.Type

export const Model = S.Struct({
    stage: Stage,
    decodeMode: DecodeMode,
    encodeMode: EncodeMode,
    boundaryMode: BoundaryMode,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
    SelectedChannelSchemaStage: {
        stage: Stage,
    },
    SelectedChannelSchemaDecodeMode: {
        decodeMode: DecodeMode,
    },
    SelectedChannelSchemaEncodeMode: {
        encodeMode: EncodeMode,
    },
    SelectedChannelSchemaBoundaryMode: {
        boundaryMode: BoundaryMode,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Decode",
    decodeMode: "Typed",
    encodeMode: "Typed",
    boundaryMode: "Types",
})

type UpdateReturn = FoldkitUpdate.Return<Model, Message>

export const update = (model: Model, message: Message) =>
    Message.match<UpdateReturn>(message, {
        SelectedChannelSchemaStage: ({ stage }) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedChannelSchemaDecodeMode: ({ decodeMode }) => ({
            model: modifyFields(model, {
                decodeMode: () => decodeMode,
            }),
        }),

        SelectedChannelSchemaEncodeMode: ({ encodeMode }) => ({
            model: modifyFields(model, {
                encodeMode: () => encodeMode,
            }),
        }),

        SelectedChannelSchemaBoundaryMode: ({ boundaryMode }) => ({
            model: modifyFields(model, {
                boundaryMode: () => boundaryMode,
            }),
        }),
    })

// -----------------------------------------------------------------------------
// Pure visual helpers
// -----------------------------------------------------------------------------

export const decodeResult = (
    mode: DecodeMode
): Readonly<{
    inputType: string
    input: ReadonlyArray<ReadonlyArray<unknown>>
    outputType: string
    output: ReadonlyArray<ReadonlyArray<number>>
    error: string
    expression: string
    detail: string
}> => {
    switch (mode) {
        case "Typed":
            return {
                inputType: "NonEmptyReadonlyArray<string>",
                input: { model: ["1", "2"], commands: ["3"] },
                outputType: "NonEmptyReadonlyArray<number>",
                output: { model: [1, 2], commands: [3] },
                error: "SchemaError",
                expression: "ChannelSchema.decode(Schema.NumberFromString)()",
                detail: "decode preserves the Schema's Encoded input type. Each non-empty string chunk is validated and decoded as one Schema.NonEmptyArray operation.",
            }

        case "Unknown":
            return {
                inputType: "NonEmptyReadonlyArray<unknown>",
                input: { model: ["1", "2"], commands: ["3"] },
                outputType: "NonEmptyReadonlyArray<number>",
                output: { model: [1, 2], commands: [3] },
                error: "SchemaError",
                expression:
                    "ChannelSchema.decodeUnknown(Schema.NumberFromString)()",
                detail: "decodeUnknown intentionally erases only the encoded input type. The decoded output remains statically number[].",
            }

        case "Invalid":
            return {
                inputType: "NonEmptyReadonlyArray<string>",
                input: [["1", "oops", "3"]],
                outputType: "no output chunk",
                output: [],
                error: "SchemaError",
                expression:
                    'ChannelSchema.decode(NumberFromString, { errors: "all" })()',
                detail: "If any value in a chunk fails decoding, that pull fails with SchemaError rather than emitting a partially decoded chunk.",
            }
    }
}

export const encodeResult = (
    mode: EncodeMode
): Readonly<{
    inputType: string
    input: ReadonlyArray<ReadonlyArray<number>>
    outputType: string
    output: ReadonlyArray<ReadonlyArray<string>>
    expression: string
    detail: string
}> =>
    mode === "Typed"
        ? {
              inputType: "NonEmptyReadonlyArray<number>",
              input: { model: [1, 2], commands: [3] },
              outputType: "NonEmptyReadonlyArray<string>",
              output: { model: ["1", "2"], commands: ["3"] },
              expression: "ChannelSchema.encode(Schema.NumberFromString)()",
              detail: "encode accepts Schema Type values and emits the Schema Encoded representation while preserving the encoded type statically.",
          }
        : {
              inputType: "NonEmptyReadonlyArray<number>",
              input: { model: [1, 2], commands: [3] },
              outputType: "NonEmptyReadonlyArray<unknown>",
              output: { model: ["1", "2"], commands: ["3"] },
              expression:
                  "ChannelSchema.encodeUnknown(Schema.NumberFromString)()",
              detail: "encodeUnknown performs the same runtime encoding but deliberately types the encoded output as unknown for an untyped boundary.",
          }

export const duplexFacts = (): ReadonlyArray<readonly [string, string]> => [
    ["caller input", "NonEmptyReadonlyArray<number>"],
    ["encode", "number[] → string[]"],
    ["inner channel", "encoded string[] ↔ string[]"],
    ["decode", "string[] → number[]"],
    ["caller output", "NonEmptyReadonlyArray<number>"],
]

export const boundaryResult = (
    mode: BoundaryMode
): Readonly<{
    title: string
    lines: ReadonlyArray<string>
    detail: string
}> => {
    switch (mode) {
        case "Types":
            return {
                title: "typed vs unknown variants",
                lines: [
                    "decode: Encoded[] → Type[]",
                    "decodeUnknown: unknown[] → Type[]",
                    "encode: Type[] → Encoded[]",
                    "encodeUnknown: Type[] → unknown[]",
                ],
                detail: "The Unknown variants are type-boundary choices, not different runtime codecs.",
            }

        case "Errors":
            return {
                title: "SchemaError joins the Channel error",
                lines: [
                    "decode OutErr = upstream error | SchemaError",
                    "encode OutErr = upstream error | SchemaError",
                    "duplex output error also includes SchemaError",
                    "invalid chunk → no partial output chunk",
                ],
                detail: "ChannelSchema keeps validation failure in the typed Channel error channel so ordinary Channel recovery/retry operators remain available.",
            }

        case "Options":
            return {
                title: "decode accepts Schema parse options",
                lines: [
                    'decode(schema, { errors: "all" })',
                    "decodeUnknown(schema, options)",
                    "options apply to Schema decoding",
                    "encode has no parse-options argument",
                ],
                detail: "Parse options are passed through to Schema.decodeEffect for the whole non-empty chunk.",
            }

        case "Services":
            return {
                title: "Schema services become Channel Env",
                lines: [
                    "encode requires S[EncodingServices]",
                    "decode requires S[DecodingServices]",
                    "duplex requires input encoding + output decoding services",
                    "IE / Done types flow through unchanged",
                ],
                detail: "A serviceful Schema does not hide dependencies: ChannelSchema widens the Channel environment with the Schema services needed at that boundary.",
            }
    }
}

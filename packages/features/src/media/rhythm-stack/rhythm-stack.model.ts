import { Schema as S } from "effect"

export const Transport = S.Union([
    S.TaggedStruct("Stopped", {
        step: S.Number,
    }),
    S.TaggedStruct("Playing", {
        step: S.Number,
    }),
])

export type Transport = typeof Transport.Type

export const EnabledRhythms = S.Struct({
    sixEight: S.Boolean,
    fiveFour: S.Boolean,
    sevenFour: S.Boolean,
    twoFour: S.Boolean,
    threeFour: S.Boolean,
})

export type EnabledRhythms = typeof EnabledRhythms.Type

export const Model = S.Struct({
    tempo: S.Number,
    transport: Transport,
    enabledRhythms: EnabledRhythms,
    // What the last acquire or pulse saw. A pulse into a context that never
    // resumed makes no sound and raises nothing, so without this the only
    // symptom is silence.
    maybeAudioError: S.Option(S.String),
})

export type Model = typeof Model.Type

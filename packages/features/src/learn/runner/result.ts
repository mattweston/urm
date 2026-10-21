import { Match as M, Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

// What a node shows when it settles.
//
// PORT NOTE: upstream models these as `RenderableResult` subclasses, each with
// its own `render()`. A Foldkit Model has to be Schema-encodable and a view has
// to stay pure, so the class hierarchy becomes a tagged union and `render()`
// becomes one match in the view. Same distinction, same output — a temperature
// knows it is a temperature rather than arriving pre-baked as the string "65°".

export const PrimitiveResult = taggedStruct("PrimitiveResult", {
    value: S.String,
})
export const EmojiResult = taggedStruct("EmojiResult", { emoji: S.String })
export const TemperatureResult = taggedStruct("TemperatureResult", {
    degrees: S.Number,
})
export const TemperatureListResult = taggedStruct("TemperatureListResult", {
    degrees: S.Array(S.Number),
})

export const ResultValue = S.Union([
    PrimitiveResult,
    EmojiResult,
    TemperatureResult,
    TemperatureListResult,
])
export type ResultValue = typeof ResultValue.Type

export const primitive = (value: string): ResultValue =>
    PrimitiveResult({ value })

export const emoji = (glyph: string): ResultValue =>
    EmojiResult({ emoji: glyph })

export const temperature = (degrees: number): ResultValue =>
    TemperatureResult({ degrees })

export const temperatures = (degrees: ReadonlyArray<number>): ResultValue =>
    TemperatureListResult({ degrees })

// The plain-text form, for places that need a string rather than markup — the
// node's accessible label, and anything that ends up in a notification.
export const result_text = (value: ResultValue): string =>
    M.value(value).pipe(
        M.withReturnType<string>(),
        M.tagsExhaustive({
            PrimitiveResult: ({ value: text }) => text,
            EmojiResult: ({ emoji: glyph }) => glyph,
            TemperatureResult: ({ degrees }) => `${degrees.toString()}°`,
            TemperatureListResult: ({ degrees }) =>
                `[${degrees.map((value) => `${value.toString()}°`).join(", ")}]`,
        })
    )

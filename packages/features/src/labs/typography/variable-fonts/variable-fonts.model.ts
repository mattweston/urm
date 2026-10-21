import { Schema as S } from "effect"

import { Font } from "./variable-fonts.data.ts"

export const Model = S.Struct({
    weight: S.Number,
    size: S.Number,
    sample: S.String,
    font: Font,
    isItalic: S.Boolean,
    isAnimating: S.Boolean,
    areStaticsLoaded: S.Boolean,
})
export type Model = typeof Model.Type

export const init = (): readonly [Model, ReadonlyArray<never>] => [
    {
        weight: 437,
        size: 72,
        sample: "Handgloves",
        font: "geist-sans",
        isItalic: false,
        isAnimating: false,
        areStaticsLoaded: false,
    },
    [],
]

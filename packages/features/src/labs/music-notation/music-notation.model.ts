import { Schema as S } from "effect"

export const Model = S.Struct({
    abcNotation: S.String,
    isPlaying: S.Boolean,
    showTablature: S.Boolean,
})

export type Model = typeof Model.Type

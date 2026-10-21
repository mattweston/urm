import { Schema as S } from "effect"

export const Model = S.Struct({
    // outlines the article and its paragraphs so the clamped bounds are
    // visible without measuring; outline is used rather than border because it
    // does not take part in layout
    showGuides: S.Boolean,
})
export type Model = typeof Model.Type

export const initialModel: Model = Model.make({ showGuides: false })

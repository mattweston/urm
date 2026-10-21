import { Schema as S } from "effect"

export const PreviewShape = S.Literals(["portrait", "square", "landscape"])
export type PreviewShape = typeof PreviewShape.Type

export const Model = S.Struct({
    box_count: S.Number,
    preview_shape: PreviewShape,
})

export type Model = typeof Model.Type

export const initial_model: Model = Model.make({
    box_count: 5,
    preview_shape: "square",
})

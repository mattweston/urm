import { Schema as S } from "effect"

export const JustifyItems = S.Literals(["start", "center", "end", "stretch"])
export type JustifyItems = typeof JustifyItems.Type

export const Model = S.Struct({
    justify_items: JustifyItems,
})
export type Model = typeof Model.Type

export const initial_model: Model = Model.make({
    justify_items: "start",
})

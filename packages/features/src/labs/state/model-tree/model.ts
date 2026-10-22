import { Schema as S } from "effect"

export const Focus = S.Literals(["ownership", "messages", "sidebar"])
export type Focus = typeof Focus.Type

export const Model = S.Struct({
    focus: Focus,
})
export type Model = typeof Model.Type

export const init: Model = Model.make({
    focus: "ownership",
})

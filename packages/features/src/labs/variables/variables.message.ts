import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const VariableName = S.Literals(["count", "width", "height"])
export type VariableName = typeof VariableName.Type

export const ChangedVariable = taggedStruct("ChangedVariable", {
    variable: VariableName,
    value: S.Number,
})

export const ChangedWorkspaceName = taggedStruct("ChangedWorkspaceName", {
    workspaceName: S.String,
})

export const ToggledPublished = taggedStruct("ToggledPublished")

export const Message = S.Union([
    ChangedVariable,
    ChangedWorkspaceName,
    ToggledPublished,
])
export type Message = typeof Message.Type

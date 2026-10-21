import { Schema as S } from "effect"
import { Canvas } from "foldkit"
import { taggedStruct } from "foldkit/schema"

export const StartedPointer = taggedStruct("StartedPointer", {
    point: Canvas.Point,
})
export const MovedPointer = taggedStruct("MovedPointer", {
    point: Canvas.Point,
})
export const EndedPointer = taggedStruct("EndedPointer")
export const CancelledPointer = taggedStruct("CancelledPointer")
export const Zoomed = taggedStruct("Zoomed", { factor: S.Number })
export const Centered = taggedStruct("Centered")
export const Selected = taggedStruct("Selected", { id: S.String })
export const Nudged = taggedStruct("Nudged", {
    id: S.String,
    x: S.Number,
    y: S.Number,
})
export const Added = taggedStruct("Added")
export const Undid = taggedStruct("Undid")
export const Redid = taggedStruct("Redid")
export const ToggledGrid = taggedStruct("ToggledGrid")
export const ToggledEdges = taggedStruct("ToggledEdges")
export const Message = S.Union([
    StartedPointer,
    MovedPointer,
    EndedPointer,
    CancelledPointer,
    Zoomed,
    Centered,
    Selected,
    Nudged,
    Added,
    Undid,
    Redid,
    ToggledGrid,
    ToggledEdges,
])
export type Message = typeof Message.Type

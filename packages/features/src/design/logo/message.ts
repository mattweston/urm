import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

import { ElementKind, PaintToken, Point } from "./model.ts"

export const GeometryProperty = S.Literals([
    "width",
    "height",
    "radius",
    "x1",
    "y1",
    "x2",
    "y2",
    "stroke_width",
])
export type GeometryProperty = typeof GeometryProperty.Type

export const SelectedElement = taggedStruct("SelectedElement", { id: S.String })
export const LoadedBlank = taggedStruct("LoadedBlank")
export const LoadedTemplate = taggedStruct("LoadedTemplate")
export const AddedElement = taggedStruct("AddedElement", { kind: ElementKind })
export const DuplicatedSelected = taggedStruct("DuplicatedSelected")
export const DeletedSelected = taggedStruct("DeletedSelected")
export const NudgedSelected = taggedStruct("NudgedSelected", {
    x: S.Number,
    y: S.Number,
})
export const StartedDragging = taggedStruct("StartedDragging", {
    id: S.String,
    point: Point,
})
export const DraggedTo = taggedStruct("DraggedTo", {
    point: Point,
    bypass_snap: S.Boolean,
})
export const EndedDragging = taggedStruct("EndedDragging")
export const CancelledDragging = taggedStruct("CancelledDragging")
export const ChangedPaint = taggedStruct("ChangedPaint", { paint: PaintToken })
export const ChangedGeometry = taggedStruct("ChangedGeometry", {
    property: GeometryProperty,
    value: S.Number,
})
export const ToggledSnapToGrid = taggedStruct("ToggledSnapToGrid")
export const RequestedSave = taggedStruct("RequestedSave")
export const StartedSaving = taggedStruct("StartedSaving")
export const Saved = taggedStruct("Saved")
export const FailedSaving = taggedStruct("FailedSaving", { details: S.String })
export const Undid = taggedStruct("Undid")
export const Redid = taggedStruct("Redid")

export const Message = S.Union([
    SelectedElement,
    LoadedBlank,
    LoadedTemplate,
    AddedElement,
    DuplicatedSelected,
    DeletedSelected,
    NudgedSelected,
    StartedDragging,
    DraggedTo,
    EndedDragging,
    CancelledDragging,
    ChangedPaint,
    ChangedGeometry,
    ToggledSnapToGrid,
    RequestedSave,
    StartedSaving,
    Saved,
    FailedSaving,
    Undid,
    Redid,
])
export type Message = typeof Message.Type

import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import * as Ui from "@foldkit/ui"

import { ObjectComponentKind } from "./object.model.ts"

export const AddedComponent = taggedStruct("AddedComponent", {
    kind: ObjectComponentKind,
})
export const SelectedComponent = taggedStruct("SelectedComponent", {
    component_id: S.String,
})
export const RemovedComponent = taggedStruct("RemovedComponent", {
    component_id: S.String,
})
export const DuplicatedComponent = taggedStruct("DuplicatedComponent", {
    component_id: S.String,
})
export const MovedComponent = taggedStruct("MovedComponent", {
    component_id: S.String,
    direction: S.Literals(["up", "down"]),
})
export const ChangedComponentLabel = taggedStruct("ChangedComponentLabel", {
    value: S.String,
})
export const ChangedComponentHref = taggedStruct("ChangedComponentHref", {
    value: S.String,
})
export const ChangedComponentName = taggedStruct("ChangedComponentName", {
    value: S.String,
})
export const ChangedComponentDescription = taggedStruct(
    "ChangedComponentDescription",
    {
        value: S.String,
    }
)
export const ChangedComponentPlaceholder = taggedStruct(
    "ChangedComponentPlaceholder",
    {
        value: S.String,
    }
)
export const ToggledComponentRequired = taggedStruct(
    "ToggledComponentRequired",
    {
        required: S.Boolean,
    }
)
export const AddedComponentOption = taggedStruct("AddedComponentOption")
export const ChangedComponentOptionLabel = taggedStruct(
    "ChangedComponentOptionLabel",
    {
        option_id: S.String,
        value: S.String,
    }
)
export const ChangedComponentOptionValue = taggedStruct(
    "ChangedComponentOptionValue",
    {
        option_id: S.String,
        value: S.String,
    }
)
export const RemovedComponentOption = taggedStruct("RemovedComponentOption", {
    option_id: S.String,
})
export const GotDragAndDropMessage = taggedStruct("GotDragAndDropMessage", {
    message: Ui.DragAndDrop.Message,
})

export const Message = S.Union([
    AddedComponent,
    SelectedComponent,
    RemovedComponent,
    DuplicatedComponent,
    MovedComponent,
    ChangedComponentLabel,
    ChangedComponentHref,
    ChangedComponentName,
    ChangedComponentDescription,
    ChangedComponentPlaceholder,
    ToggledComponentRequired,
    AddedComponentOption,
    ChangedComponentOptionLabel,
    ChangedComponentOptionValue,
    RemovedComponentOption,
    GotDragAndDropMessage,
])
export type Message = typeof Message.Type

import { Option, Schema as S } from "effect"
import * as Ui from "@foldkit/ui"
import {
    FormFieldDefinition,
    FormFieldKind,
    FormFieldOption,
} from "@urm/domain/schemas/forms"

export const ObjectComponentKind = FormFieldKind
export type ObjectComponentKind = typeof ObjectComponentKind.Type

export const ObjectComponentOption = FormFieldOption
export type ObjectComponentOption = typeof ObjectComponentOption.Type

export const ObjectComponent = FormFieldDefinition
export type ObjectComponent = typeof ObjectComponent.Type

export const ObjectDefinition = S.Struct({
    id: S.String,
    name: S.String,
    components: S.Array(ObjectComponent),
})
export type ObjectDefinition = typeof ObjectDefinition.Type

export const Model = S.Struct({
    definition: ObjectDefinition,
    selected_component_id: S.Option(S.String),
    drag_and_drop: Ui.DragAndDrop.Model,
})
export type Model = typeof Model.Type

export const makeModel = (definition: ObjectDefinition): Model =>
    Model.make({
        definition,
        selected_component_id: Option.none(),
        drag_and_drop: Ui.DragAndDrop.init({
            id: `object-builder-${definition.id}`,
            orientation: "Vertical",
        }),
    })

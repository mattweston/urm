import { Option, Schema as S } from "effect"
import * as Ui from "@foldkit/ui"
import { Column } from "./kanban.column.ts"

export const SavedBoard = S.Struct({
    columns: S.Array(Column),
})

export type SavedBoard = typeof SavedBoard.Type

export const Model = S.Struct({
    columns: S.Array(Column),
    dragAndDrop: Ui.DragAndDrop.Model,
    maybeNewCardColumnId: S.Option(S.String),
    newCardTitle: S.String,
    announcement: S.String,
})

export type Model = typeof Model.Type

export const emptyModel = (
    columns: typeof SavedBoard.fields.columns.Type
): Model => ({
    columns,
    dragAndDrop: Ui.DragAndDrop.init({ id: "kanban" }),
    maybeNewCardColumnId: Option.none(),
    newCardTitle: "",
    announcement: "",
})

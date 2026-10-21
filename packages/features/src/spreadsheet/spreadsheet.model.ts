import { Schema as S } from "effect"
import { VirtualList } from "@foldkit/ui"
import { taggedStruct } from "foldkit/schema"

const CellAddress = S.Struct({ row: S.Number, column: S.Number })
export const IdleEditor = taggedStruct("IdleEditor")
export const EditingCell = taggedStruct("EditingCell", {
    address: CellAddress,
    draft: S.String,
})
export const Editor = S.Union([IdleEditor, EditingCell])

export const Model = S.Struct({
    source: S.Literals(["browser", "table"]),
    title: S.String,
    row_count: S.Number,
    column_labels: S.Array(S.String),
    can_write: S.Boolean,
    cells: S.Record(S.String, S.String),
    selected: CellAddress,
    editor: Editor,
    nameDraft: S.String,
    status: S.String,
    rows: VirtualList.Model,
    columnScrollLeft: S.Number,
    columnViewportWidth: S.Number,
})

export type Model = typeof Model.Type

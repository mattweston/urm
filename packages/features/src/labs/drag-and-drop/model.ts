import * as Ui from "@foldkit/ui"
import { Schema as S } from "effect"
import { DemoColumn } from "./columns.ts"

export const Model = S.Struct({
    dragAndDrop: Ui.DragAndDrop.Model,
    columns: S.Array(DemoColumn),
})

export type Model = typeof Model.Type

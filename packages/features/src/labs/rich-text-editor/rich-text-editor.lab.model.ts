import { Schema as S } from "effect"
import { RichTextEditorModel } from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.schema.ts"

export const Model = S.Struct({
    title: S.String,
    editor: RichTextEditorModel,
})

export type Model = typeof Model.Type

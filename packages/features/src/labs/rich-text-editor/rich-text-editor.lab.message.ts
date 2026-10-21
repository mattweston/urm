import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import { RichTextEditorMessage } from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.schema.ts"

export const UpdatedDocumentTitle = taggedStruct("UpdatedDocumentTitle", {
    value: S.String,
})
export const ClickedDownloadDocument = taggedStruct("ClickedDownloadDocument")
export const GotDocumentRichTextEditorMessage = taggedStruct(
    "GotDocumentRichTextEditorMessage",
    {
        message: RichTextEditorMessage,
    }
)
export const DownloadedDocument = taggedStruct("DownloadedDocument")

export const Message = S.Union([
    UpdatedDocumentTitle,
    ClickedDownloadDocument,
    GotDocumentRichTextEditorMessage,
    DownloadedDocument,
])

export type Message = typeof Message.Type

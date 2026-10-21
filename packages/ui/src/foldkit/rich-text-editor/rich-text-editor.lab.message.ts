import { RichTextEditorMessage } from "./rich-text-editor.schema.ts"

export const Message = RichTextEditorMessage

export type Message = typeof Message.Type

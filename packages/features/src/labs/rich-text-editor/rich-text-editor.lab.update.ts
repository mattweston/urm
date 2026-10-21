import { Effect, Match as M, Schema as S } from "effect"
import { Command } from "foldkit"
import { modifyFields } from "foldkit/struct"
import { RichTextDocument as RichTextDocumentSchema } from "@urm/domain/schemas/rich-text"
import {
    initRichTextEditor,
    updateRichTextEditor,
} from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.view.ts"
import { downloadRichTextHtml } from "../../documents/html/download.client.ts"
import type { Model } from "./rich-text-editor.lab.model.ts"
import {
    DownloadedDocument,
    GotDocumentRichTextEditorMessage,
    type Message,
} from "./rich-text-editor.lab.message.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const DownloadDocument = Command.define("DownloadDocument", {
    args: { title: S.String, document: RichTextDocumentSchema },
    messages: [DownloadedDocument],
    execute: ({ title, document }) =>
        Effect.sync(() => downloadRichTextHtml({ title, document })).pipe(
            Effect.as(DownloadedDocument())
        ),
})

export const init = (): UpdateReturn => [
    { title: "Untitled document", editor: initRichTextEditor() },
    [],
]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            UpdatedDocumentTitle: ({ value }) => [
                modifyFields(model, { title: () => value }),
                [],
            ],
            ClickedDownloadDocument: () => [
                model,
                [
                    DownloadDocument({
                        title: model.title.trim() || "Untitled document",
                        document: model.editor.document,
                    }),
                ],
            ],
            GotDocumentRichTextEditorMessage: ({ message }) => {
                const [editor, commands] = updateRichTextEditor(
                    model.editor,
                    message
                )
                return [
                    modifyFields(model, { editor: () => editor }),
                    Command.mapMessages(commands, (message) =>
                        GotDocumentRichTextEditorMessage({ message })
                    ),
                ]
            },
            DownloadedDocument: () => [model, []],
        })
    )

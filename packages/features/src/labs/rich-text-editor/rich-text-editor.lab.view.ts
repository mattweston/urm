/** # Rich Text Editor view */
import type { Html, HtmlBuilder } from "foldkit/html"
import { RichTextEditor } from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.view.ts"
import { Button } from "@urm/ui/foldkit/button/button.view.ts"
import type { Model } from "./rich-text-editor.lab.model.ts"
import {
    ClickedDownloadDocument,
    GotDocumentRichTextEditorMessage,
    UpdatedDocumentTitle,
    type Message,
} from "./rich-text-editor.lab.message.ts"

export const richTextEditorTitle = "Rich Text Editor | Design"

/**
 * Edit the document, select blocks, and reorder content with drag and drop. The
 * editor’s document events, keyboard handling, and auto-scroll streams are
 * owned by the embedded runtime.
 */
export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class("mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6")],
        [
            h.header(
                [h.Class("grid gap-4")],
                [
                    h.div(
                        [
                            h.Class(
                                "flex flex-wrap items-center justify-between gap-3"
                            ),
                        ],
                        [
                            h.div(
                                [h.Class("grid gap-1")],
                                [
                                    h.h1(
                                        [
                                            h.Class(
                                                "text-2xl font-semibold tracking-tight"
                                            ),
                                        ],
                                        ["Rich Text Editor"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "text-sm text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Local editor demo. Content is not saved to the database.",
                                        ]
                                    ),
                                ]
                            ),
                            Button<ParentMessage>(
                                {
                                    variant: "secondary",
                                    onClick: toParentMessage(
                                        ClickedDownloadDocument()
                                    ),
                                    children: ["Download HTML"],
                                },
                                h
                            ),
                        ]
                    ),
                ]
            ),
            h.article(
                [
                    h.Class(
                        "mx-auto grid min-h-[46rem] w-full max-w-4xl content-start gap-6 rounded-[var(--radius-frame)] border border-border bg-background px-6 py-10 shadow-sm sm:px-12"
                    ),
                ],
                [
                    h.label(
                        [h.Class("grid gap-1.5")],
                        [
                            h.span([h.Class("sr-only")], ["Title"]),
                            h.input([
                                h.Value(model.title),
                                h.Placeholder("Untitled document"),
                                h.Class(
                                    "w-full border-0 bg-transparent p-0 text-4xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/60"
                                ),
                                h.OnInput((value) =>
                                    toParentMessage(
                                        UpdatedDocumentTitle({ value })
                                    )
                                ),
                            ]),
                        ]
                    ),
                    RichTextEditor<ParentMessage>(
                        {
                            id: "lab-rich-text-editor",
                            model: model.editor,
                            toParentMessage: (message) =>
                                toParentMessage(
                                    GotDocumentRichTextEditorMessage({
                                        message,
                                    })
                                ),
                            label: "Editor",
                            description:
                                "Type / for blocks. Use Cmd+B or Cmd+I for inline formatting.",
                            placeholder: "Start writing...",
                            isDisabled: false,
                        },
                        h
                    ),
                ]
            ),
        ]
    )
}

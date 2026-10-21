import type { Html, HtmlBuilder } from "foldkit/html"
import { RichTextEditor } from "./rich-text-editor.view.ts"
import type { Model } from "./rich-text-editor.lab.model.ts"
import type { Message } from "./rich-text-editor.lab.message.ts"

export const richTextEditorTitle = "Rich Text Editor | Labs"

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class("mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8")],
        [
            RichTextEditor<ParentMessage>(
                {
                    id: "lab-rich-text-editor",
                    model,
                    toParentMessage,
                    label: "Rich Text Editor",
                    description:
                        "Model-owned rich text editor with paragraph, heading, blockquote, bold, and italic nodes. Keyboard shortcuts: Cmd+B for bold, Cmd+I for italic. Type / for commands.",
                    placeholder: "Press / for commands",
                    isDebugSelectionVisible: true,
                },
                h
            ),
        ]
    )
}

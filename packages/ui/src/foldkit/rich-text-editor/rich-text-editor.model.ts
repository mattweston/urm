import { Option } from "effect"
import { Combobox, Dialog, DragAndDrop } from "@foldkit/ui"
import {
    blockText,
    collapsedSelection,
    paragraph,
} from "./rich-text-editor.document.ts"
import type {
    RichTextEditorModel,
    RichTextSelection,
    RichTextSlashMenu,
} from "./rich-text-editor.schema.ts"

const closedSlashMenu = (selection: RichTextSelection): RichTextSlashMenu => ({
    isOpen: false,
    anchorSelection: selection,
    query: "",
    activeIndex: 0,
})

export const initRichTextEditor = (value = ""): RichTextEditorModel => ({
    document: { type: "doc", children: [paragraph(value)] },
    selection: collapsedSelection(value.length),
    slashMenu: closedSlashMenu(collapsedSelection(value.length)),
    maybeMountedHostId: Option.none(),
    dragAndDrop: DragAndDrop.init({ id: "rich-text-editor" }),
    linkDialog: {
        dialog: Dialog.init({
            id: "rich-text-editor-link-dialog",
            focusSelector: "#rich-text-editor-link-text",
        }),
        bookmarks: Combobox.init({ id: "rich-text-editor-bookmarks" }),
        text: "",
        href: "https://",
        selection: collapsedSelection(value.length),
    },
    resolved_image_urls: [],
})

export const richTextEditorPlainText = (model: RichTextEditorModel): string =>
    model.document.children.map(blockText).join("\n")

export const resetRichTextEditorSlashMenu = (
    model: RichTextEditorModel
): RichTextEditorModel => ({
    ...model,
    slashMenu: closedSlashMenu(model.selection),
})

// NOTE: A host that stops being rendered has to give this id back, or the next
// mount is a no-op for the subscriptions: `richTextEditorSubscriptions` binds its
// listeners to whichever element `getElementById` returns when the stream is
// acquired, and it only re-acquires when the model changes. A stale
// `Some(hostId)` means the stream is rebuilt against the old element the moment
// editing resumes, and the later mount leaves the model untouched, so it is never
// rebuilt against the live one. Callers that keep the editor mounted forever
// never need this; callers that toggle it do.
export const unmountRichTextEditorHost = (
    model: RichTextEditorModel
): RichTextEditorModel => ({
    ...model,
    maybeMountedHostId: Option.none(),
})

/**
 * # Rich Text Editor Schema
 *
 * The message union and the document node union. The document is a decodable
 * schema rather than DOM state read back out of contenteditable — only
 * rich-text-editor.dom.ts touches the DOM, everything above works on the
 * decoded document.
 *
 * Built from scratch on Foldkit; the tiptap and prosekit dependencies in
 * package.json are unused leftovers.
 */

import { Schema } from "effect"
import { File } from "foldkit"
import { Combobox, Dialog, DragAndDrop } from "@foldkit/ui"
import { taggedStruct } from "foldkit/schema"
import {
    RichTextBlockNode as RichTextBlockNodeSchema,
    RichTextDocument as RichTextDocumentSchema,
    RichTextHeadingLevel as RichTextHeadingLevelSchema,
    RichTextImageNode as RichTextImageNodeSchema,
    RichTextMark as RichTextMarkSchema,
    RichTextTextNode as RichTextTextNodeSchema,
} from "@urm/domain/schemas/rich-text"

export const InsertedRichTextEditorText = taggedStruct(
    "InsertedRichTextEditorText",
    {
        value: Schema.String,
    }
)
export const PastedRichTextEditorMarkdown = taggedStruct(
    "PastedRichTextEditorMarkdown",
    {
        value: Schema.String,
        start: Schema.optional(Schema.Number),
        end: Schema.optional(Schema.Number),
    }
)
export const SyncedRichTextEditorPlainText = taggedStruct(
    "SyncedRichTextEditorPlainText",
    {
        value: Schema.String,
        start: Schema.optional(Schema.Number),
        end: Schema.optional(Schema.Number),
    }
)
export const DeletedRichTextEditorBackward = taggedStruct(
    "DeletedRichTextEditorBackward",
    {
        start: Schema.optional(Schema.Number),
        end: Schema.optional(Schema.Number),
        unit: Schema.optional(
            Schema.Union([Schema.Literal("character"), Schema.Literal("word")])
        ),
    }
)
export const SplitRichTextEditorBlock = taggedStruct("SplitRichTextEditorBlock")
export const SelectedRichTextEditorAll = taggedStruct(
    "SelectedRichTextEditorAll"
)
export const RestoredRichTextEditorSelection = taggedStruct(
    "RestoredRichTextEditorSelection"
)
export const MountedRichTextEditorHost = taggedStruct(
    "MountedRichTextEditorHost",
    {
        id: Schema.String,
    }
)
export const FailedMountRichTextEditorHost = taggedStruct(
    "FailedMountRichTextEditorHost",
    { reason: Schema.String }
)
export const UpdatedRichTextEditorSelection = taggedStruct(
    "UpdatedRichTextEditorSelection",
    {
        start: Schema.Number,
        end: Schema.Number,
    }
)
export const OpenedRichTextEditorSlashMenu = taggedStruct(
    "OpenedRichTextEditorSlashMenu"
)
export const ClosedRichTextEditorSlashMenu = taggedStruct(
    "ClosedRichTextEditorSlashMenu"
)
export const UpdatedRichTextEditorSlashMenuQuery = taggedStruct(
    "UpdatedRichTextEditorSlashMenuQuery",
    { value: Schema.String }
)
export const MovedRichTextEditorSlashMenuSelection = taggedStruct(
    "MovedRichTextEditorSlashMenuSelection",
    {
        delta: Schema.Number,
    }
)
export const SelectedRichTextEditorSlashCommand = taggedStruct(
    "SelectedRichTextEditorSlashCommand",
    { value: Schema.String }
)
export const SelectedRichTextEditorBlockFormat = taggedStruct(
    "SelectedRichTextEditorBlockFormat",
    {
        type: Schema.Union([
            Schema.Literal("paragraph"),
            Schema.Literal("heading"),
            Schema.Literal("blockquote"),
        ]),
        level: Schema.optional(
            Schema.Union([
                Schema.Literal(1),
                Schema.Literal(2),
                Schema.Literal(3),
            ])
        ),
    }
)
export const ClickedRichTextEditorMark = taggedStruct(
    "ClickedRichTextEditorMark",
    {
        type: Schema.Union([
            Schema.Literal("bold"),
            Schema.Literal("italic"),
            Schema.Literal("link"),
        ]),
        start: Schema.optional(Schema.Number),
        end: Schema.optional(Schema.Number),
    }
)
export const SubmittedLinkUrl = taggedStruct("SubmittedLinkUrl", {
    href: Schema.String,
    text: Schema.String,
    start: Schema.Number,
    end: Schema.Number,
})
export const CancelledLinkUrl = taggedStruct("CancelledLinkUrl")
export const GotLinkDialogMessage = taggedStruct("GotLinkDialogMessage", {
    message: Dialog.Message,
})
export const UpdatedLinkText = taggedStruct("UpdatedLinkText", {
    value: Schema.String,
})
export const UpdatedLinkHref = taggedStruct("UpdatedLinkHref", {
    value: Schema.String,
})
export const GotLinkBookmarksMessage = taggedStruct("GotLinkBookmarksMessage", {
    message: Combobox.Message,
    title: Schema.String,
})
export const SelectedLinkSuggestion = taggedStruct("SelectedLinkSuggestion", {
    title: Schema.String,
    href: Schema.String,
})
export const UploadedImage = taggedStruct("UploadedImage", {
    src: Schema.String,
    alt: Schema.String,
    resolved_src: Schema.optional(Schema.String),
})
export const ResolvedRichTextImageUrls = taggedStruct(
    "ResolvedRichTextImageUrls",
    {
        images: Schema.Array(
            Schema.Struct({
                stored_url: Schema.String,
                url: Schema.String,
            })
        ),
    }
)
export const FailedUploadImage = taggedStruct("FailedUploadImage", {
    error: Schema.String,
})
export const SelectedImageFile = taggedStruct("SelectedImageFile", {
    file: File.File,
})
export const CancelledImageSelection = taggedStruct("CancelledImageSelection")
export const ClickedEditImageAlt = taggedStruct("ClickedEditImageAlt", {
    blockIndex: Schema.Number,
})
export const SubmittedImageAlt = taggedStruct("SubmittedImageAlt", {
    blockIndex: Schema.Number,
    alt: Schema.String,
})
export const CancelledImageAlt = taggedStruct("CancelledImageAlt")
export const ClickedRichTextEditorImage = taggedStruct(
    "ClickedRichTextEditorImage"
)
export const MovedRichTextEditorBlock = taggedStruct(
    "MovedRichTextEditorBlock",
    {
        fromIndex: Schema.Number,
        toIndex: Schema.Number,
    }
)
export const AddedRichTextEditorBlock = taggedStruct(
    "AddedRichTextEditorBlock",
    {
        afterIndex: Schema.Number,
    }
)
export const GotRichTextDragAndDropMessage = taggedStruct(
    "GotRichTextDragAndDropMessage",
    {
        message: DragAndDrop.Message,
    }
)

export const RichTextEditorMessage = Schema.Union([
    InsertedRichTextEditorText,
    PastedRichTextEditorMarkdown,
    SyncedRichTextEditorPlainText,
    DeletedRichTextEditorBackward,
    SplitRichTextEditorBlock,
    SelectedRichTextEditorAll,
    RestoredRichTextEditorSelection,
    MountedRichTextEditorHost,
    FailedMountRichTextEditorHost,
    UpdatedRichTextEditorSelection,
    OpenedRichTextEditorSlashMenu,
    ClosedRichTextEditorSlashMenu,
    UpdatedRichTextEditorSlashMenuQuery,
    MovedRichTextEditorSlashMenuSelection,
    SelectedRichTextEditorSlashCommand,
    SelectedRichTextEditorBlockFormat,
    ClickedRichTextEditorMark,
    SubmittedLinkUrl,
    CancelledLinkUrl,
    GotLinkDialogMessage,
    UpdatedLinkText,
    UpdatedLinkHref,
    GotLinkBookmarksMessage,
    SelectedLinkSuggestion,
    UploadedImage,
    ResolvedRichTextImageUrls,
    FailedUploadImage,
    SelectedImageFile,
    CancelledImageSelection,
    ClickedEditImageAlt,
    SubmittedImageAlt,
    CancelledImageAlt,
    ClickedRichTextEditorImage,
    MovedRichTextEditorBlock,
    AddedRichTextEditorBlock,
    GotRichTextDragAndDropMessage,
])

export const RichTextMark = RichTextMarkSchema
export const RichTextTextNode = RichTextTextNodeSchema
export const RichTextHeadingLevel = RichTextHeadingLevelSchema
export const RichTextBlockNode = RichTextBlockNodeSchema
export const RichTextDocument = RichTextDocumentSchema
export const RichTextSelection = Schema.Struct({
    anchor: Schema.Number,
    focus: Schema.Number,
})
export const RichTextSlashMenu = Schema.Struct({
    isOpen: Schema.Boolean,
    anchorSelection: RichTextSelection,
    query: Schema.String,
    activeIndex: Schema.Number,
})
export const RichTextLinkDialog = Schema.Struct({
    dialog: Dialog.Model,
    bookmarks: Combobox.Model,
    text: Schema.String,
    href: Schema.String,
    selection: RichTextSelection,
})
export const RichTextEditorModel = Schema.Struct({
    document: RichTextDocument,
    selection: RichTextSelection,
    slashMenu: RichTextSlashMenu,
    maybeMountedHostId: Schema.Option(Schema.String),
    dragAndDrop: DragAndDrop.Model,
    linkDialog: RichTextLinkDialog,
    resolved_image_urls: Schema.Array(
        Schema.Struct({
            stored_url: Schema.String,
            url: Schema.String,
        })
    ),
})

export type RichTextMark = typeof RichTextMark.Type
export type RichTextTextNode = typeof RichTextTextNode.Type
export type RichTextHeadingLevel = typeof RichTextHeadingLevel.Type
export type RichTextBlockNode = typeof RichTextBlockNode.Type
export type RichTextDocument = typeof RichTextDocument.Type
export type RichTextSelection = typeof RichTextSelection.Type
export type RichTextSlashMenu = typeof RichTextSlashMenu.Type
export type RichTextLinkDialog = typeof RichTextLinkDialog.Type
export type RichTextEditorModel = typeof RichTextEditorModel.Type

export type RichTextEditorMessage = typeof RichTextEditorMessage.Type
export type SubmittedLinkUrl = typeof SubmittedLinkUrl.Type
export type CancelledLinkUrl = typeof CancelledLinkUrl.Type
export type UploadedImage = typeof UploadedImage.Type
export type ResolvedRichTextImageUrls = typeof ResolvedRichTextImageUrls.Type
export type FailedUploadImage = typeof FailedUploadImage.Type
export type SelectedImageFile = typeof SelectedImageFile.Type
export type ClickedEditImageAlt = typeof ClickedEditImageAlt.Type
export type SubmittedImageAlt = typeof SubmittedImageAlt.Type
export type CancelledImageAlt = typeof CancelledImageAlt.Type
export type ClickedRichTextEditorImage = typeof ClickedRichTextEditorImage.Type
export type MovedRichTextEditorBlock = typeof MovedRichTextEditorBlock.Type
export type AddedRichTextEditorBlock = typeof AddedRichTextEditorBlock.Type
export type RichTextImageNode = typeof RichTextImageNodeSchema.Type

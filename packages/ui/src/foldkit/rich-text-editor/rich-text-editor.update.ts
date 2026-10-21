import { Command, File } from "foldkit"
import { Effect, Match as M, Option, Schema as S } from "effect"
import { Combobox, Dialog, DragAndDrop } from "@foldkit/ui"
import { randomHexId } from "@urm/utils"
import { normalizeRichTextSlashMenuIndex } from "./rich-text-editor.commands.ts"
import { restoreRichTextDomSelection } from "./rich-text-editor.dom.ts"
import {
    blockSegmentAtOffset,
    blockText,
    blockWithChildren,
    collapsedSelection,
    isSelectionCollapsed,
    marksAtOffset,
    normalizeBlock,
    normalizeModel,
    normalizeSelection,
    paragraph,
    selectionEnd,
    selectionStart,
    textNodesInRange,
    textSegments,
} from "./rich-text-editor.document.ts"
import {
    richTextEditorPlainText,
    resetRichTextEditorSlashMenu,
} from "./rich-text-editor.model.ts"
import { richTextDocumentFromMarkdown } from "./rich-text-editor.markdown.ts"
import {
    ParagraphNode,
    richTextBlockFormatForSlashCommand,
    richTextCreateBlock,
    richTextMarkTypeForSlashCommand,
    type RichTextBlockFormat,
} from "./rich-text-editor.registry.ts"
import { MarkNode } from "./nodes/mark.node.ts"
import type { RichTextMarkType } from "./nodes/mark.schema.ts"
import type {
    RichTextBlockNode,
    RichTextEditorMessage,
    RichTextEditorModel,
    RichTextMark,
    RichTextSelection,
    RichTextTextNode,
} from "./rich-text-editor.schema.ts"
import {
    GotLinkDialogMessage,
    GotLinkBookmarksMessage,
    UploadedImage,
    ResolvedRichTextImageUrls,
    FailedUploadImage,
    SelectedImageFile,
    CancelledImageSelection,
    // ClickedEditImageAlt,
    SubmittedImageAlt,
    CancelledImageAlt,
    //  ClickedRichTextEditorImage,
    MovedRichTextEditorBlock,
    // AddedRichTextEditorBlock,
    GotRichTextDragAndDropMessage,
    RestoredRichTextEditorSelection,
} from "./rich-text-editor.schema.ts"
import { TextNode } from "./nodes/text.node.ts"
import { toImageSrc } from "@urm/utils/media"

const BookmarkCombobox = Combobox.create<string>()

const textNodeForInsertedText = (
    text: string,
    marks?: ReadonlyArray<RichTextMark>
): ReadonlyArray<RichTextTextNode> => TextNode.inserted(text, marks)

const selectionFromRange = (start: number, end: number): RichTextSelection => ({
    anchor: start,
    focus: end,
})

const replaceRangeWithText = (
    model: RichTextEditorModel,
    text: string
): RichTextEditorModel => {
    const plainText = richTextEditorPlainText(model)
    const selection = normalizeSelection(model.selection, plainText.length)
    const start = selectionStart(selection)
    const end = selectionEnd(selection)
    const startBlock = blockSegmentAtOffset(model, start)
    const endBlock = blockSegmentAtOffset(model, end)
    const prefix = textNodesInRange(
        startBlock.block,
        startBlock.start,
        startBlock.start,
        start
    )
    const suffix = textNodesInRange(
        endBlock.block,
        endBlock.start,
        end,
        endBlock.end
    )
    const insertMarks = marksAtOffset(model, start)
    const insertLines = text.split("\n")
    const replacementBlocks =
        insertLines.length === 1
            ? [
                  normalizeBlock(
                      blockWithChildren(startBlock.block, [
                          ...prefix,
                          ...textNodeForInsertedText(
                              insertLines[0] ?? "",
                              insertMarks
                          ),
                          ...suffix,
                      ])
                  ),
              ]
            : insertLines.map((line, index): RichTextBlockNode => {
                  const isFirst = index === 0
                  const isLast = index === insertLines.length - 1

                  const children = [
                      ...(isFirst ? prefix : []),
                      ...textNodeForInsertedText(line, insertMarks),
                      ...(isLast ? suffix : []),
                  ]
                  return normalizeBlock(
                      isFirst
                          ? blockWithChildren(startBlock.block, children)
                          : ParagraphNode.create(children)
                  )
              })
    const normalizedReplacementBlocks =
        text === ""
            ? replacementBlocks.map((block) =>
                  blockText(block).length === 0 && block.type !== "image"
                      ? richTextCreateBlock(
                            { type: "paragraph" },
                            block.children
                        )
                      : block
              )
            : replacementBlocks
    const children = [
        ...model.document.children.slice(0, startBlock.index),
        ...normalizedReplacementBlocks,
        ...model.document.children.slice(endBlock.index + 1),
    ]
    const cursor = start + text.length
    return normalizeModel({
        ...model,
        document: { type: "doc", children },
        selection: collapsedSelection(cursor),
    })
}

const applyTextInputRule = (
    model: RichTextEditorModel,
    text: string
): RichTextEditorModel | undefined => {
    const plainText = richTextEditorPlainText(model)
    const selection = normalizeSelection(model.selection, plainText.length)
    const start = selectionStart(selection)
    if (text !== " " || !isSelectionCollapsed(selection)) return undefined

    const blockSegment = blockSegmentAtOffset(model, start)
    const currentBlockText = blockText(blockSegment.block)

    const headingLevel =
        currentBlockText === "#"
            ? 1
            : currentBlockText === "##"
              ? 2
              : currentBlockText === "###"
                ? 3
                : undefined
    if (
        headingLevel !== undefined &&
        start === blockSegment.start + currentBlockText.length
    ) {
        const blocks = model.document.children.map((block, index) =>
            index === blockSegment.index
                ? richTextCreateBlock(
                      { type: "heading", level: headingLevel },
                      [TextNode.empty()]
                  )
                : block
        )
        return normalizeModel({
            ...model,
            document: { type: "doc", children: blocks },
            selection: collapsedSelection(blockSegment.start),
        })
    }

    if (start !== blockSegment.start + 1 || currentBlockText !== ">")
        return undefined

    const blocks = model.document.children.map((block, index) =>
        index === blockSegment.index
            ? richTextCreateBlock({ type: "blockquote" }, [TextNode.empty()])
            : block
    )
    return normalizeModel({
        ...model,
        document: { type: "doc", children: blocks },
        selection: collapsedSelection(blockSegment.start),
    })
}

const insertText = (
    model: RichTextEditorModel,
    text: string
): RichTextEditorModel =>
    applyTextInputRule(model, text) ?? replaceRangeWithText(model, text)

const pasteMarkdown = (
    model: RichTextEditorModel,
    markdown: string,
    selectionOverride?: RichTextSelection
): RichTextEditorModel => {
    const plainText = richTextEditorPlainText(model)
    const selection = normalizeSelection(
        selectionOverride ?? model.selection,
        plainText.length
    )
    const start = selectionStart(selection)
    const end = selectionEnd(selection)
    const startBlock = blockSegmentAtOffset(model, start)
    const endBlock = blockSegmentAtOffset(model, end)
    const prefix = textNodesInRange(
        startBlock.block,
        startBlock.start,
        startBlock.start,
        start
    )
    const suffix = textNodesInRange(
        endBlock.block,
        endBlock.start,
        end,
        endBlock.end
    )
    const pastedBlocks = richTextDocumentFromMarkdown(markdown).children
    const replacementBlocks = pastedBlocks.map(
        (block, index): RichTextBlockNode => {
            const isFirst = index === 0
            const isLast = index === pastedBlocks.length - 1
            const children = [
                ...(isFirst ? prefix : []),
                ...(block.type === "image" ? [] : block.children),
                ...(isLast ? suffix : []),
            ]
            return normalizeBlock(blockWithChildren(block, children))
        }
    )
    const children = [
        ...model.document.children.slice(0, startBlock.index),
        ...replacementBlocks,
        ...model.document.children.slice(endBlock.index + 1),
    ]
    const pastedTextLength = pastedBlocks.map(blockText).join("\n").length
    const cursor = start + pastedTextLength
    return resetRichTextEditorSlashMenu(
        normalizeModel({
            ...model,
            document: { type: "doc", children },
            selection: collapsedSelection(cursor),
        })
    )
}

const syncPlainText = (
    model: RichTextEditorModel,
    text: string,
    selectionOverride?: RichTextSelection
): RichTextEditorModel => {
    const children = text
        .split("\n")
        .map((line) => ParagraphNode.create([TextNode.of(line)]))
    return resetRichTextEditorSlashMenu(
        normalizeModel({
            ...model,
            document: { type: "doc", children },
            // NOTE: Falling back to the end of the text is only right for the
            // caller that cannot see a caret. Typing supplies the real one —
            // without it every keystroke in the middle of a line would drag the
            // caret to the end.
            selection: selectionOverride ?? collapsedSelection(text.length),
        })
    )
}

const previousWordBoundary = (text: string, offset: number): number => {
    let index = Math.max(0, Math.min(offset, text.length))
    while (index > 0 && /\s/.test(text[index - 1] ?? "")) index -= 1
    while (index > 0 && !/\s/.test(text[index - 1] ?? "")) index -= 1
    return index
}

const deleteBackward = (
    model: RichTextEditorModel,
    selectionOverride?: RichTextSelection,
    unit: "character" | "word" = "character"
): RichTextEditorModel => {
    const text = richTextEditorPlainText(model)
    const selection = normalizeSelection(
        selectionOverride ?? model.selection,
        text.length
    )
    const start = selectionStart(selection)
    const end = selectionEnd(selection)
    if (!isSelectionCollapsed(selection))
        return replaceRangeWithText({ ...model, selection }, "")
    const blockSegment = blockSegmentAtOffset(model, start)
    if (start === blockSegment.start && blockSegment.block.type === "image") {
        const blocks = model.document.children.filter(
            (_, index) => index !== blockSegment.index
        )
        const newCursor = blockSegment.start
        return normalizeModel({
            ...model,
            document: {
                type: "doc",
                children: blocks.length > 0 ? blocks : [paragraph()],
            },
            selection: collapsedSelection(newCursor),
        })
    }
    if (
        start === blockSegment.start &&
        blockText(blockSegment.block).length === 0 &&
        blockSegment.block.type !== "paragraph"
    ) {
        const blocks = model.document.children.map((block, index) =>
            index === blockSegment.index
                ? richTextCreateBlock(
                      { type: "paragraph" },
                      block.type === "image" ? [] : block.children
                  )
                : block
        )
        return normalizeModel({
            ...model,
            document: { type: "doc", children: blocks },
            selection,
        })
    }
    if (start === 0) return model
    return replaceRangeWithText(
        {
            ...model,
            selection: {
                anchor:
                    unit === "word"
                        ? previousWordBoundary(text, start)
                        : start - 1,
                focus: end,
            },
        },
        ""
    )
}

const splitBlock = (model: RichTextEditorModel): RichTextEditorModel => {
    const text = richTextEditorPlainText(model)
    const selection = normalizeSelection(model.selection, text.length)
    return replaceRangeWithText({ ...model, selection }, "\n")
}

const setBlockFormat = (
    model: RichTextEditorModel,
    format: RichTextBlockFormat
): RichTextEditorModel => {
    const selection = normalizeSelection(
        model.selection,
        richTextEditorPlainText(model).length
    )
    const selectedStart = selectionStart(selection)
    const selectedEnd = selectionEnd(selection)
    let offset = 0
    const blocks = model.document.children.map((block): RichTextBlockNode => {
        const start = offset
        const end = start + blockText(block).length
        offset = end + 1
        if (selectedStart > end || selectedEnd < start) return block
        if (block.type === "image") return block
        return richTextCreateBlock(format, block.children)
    })
    return normalizeModel({
        ...model,
        document: { type: "doc", children: blocks },
    })
}

const openSlashMenu = (model: RichTextEditorModel): RichTextEditorModel => {
    const anchorSelection = model.selection
    const nextModel = insertText(model, "/")
    return {
        ...nextModel,
        slashMenu: {
            isOpen: true,
            anchorSelection,
            query: "",
            activeIndex: -1,
        },
    }
}

const closeSlashMenu = (model: RichTextEditorModel): RichTextEditorModel => {
    if (!model.slashMenu.isOpen) return model
    const selection = selectionFromRange(
        model.slashMenu.anchorSelection.anchor,
        model.selection.focus
    )
    const nextModel = replaceRangeWithText({ ...model, selection }, "")
    return resetRichTextEditorSlashMenu(nextModel)
}

const updateSlashMenuQuery = (
    model: RichTextEditorModel,
    query: string
): RichTextEditorModel => {
    const previousQuery = model.slashMenu.query
    const nextModel = query.startsWith(previousQuery)
        ? insertText(model, query.slice(previousQuery.length))
        : previousQuery.startsWith(query)
          ? deleteBackward(model, {
                anchor:
                    model.selection.focus -
                    (previousQuery.length - query.length),
                focus: model.selection.focus,
            })
          : replaceRangeWithText(
                {
                    ...model,
                    selection: selectionFromRange(
                        model.slashMenu.anchorSelection.anchor + 1,
                        model.selection.focus
                    ),
                },
                query
            )

    return {
        ...nextModel,
        slashMenu: {
            ...model.slashMenu,
            query,
            activeIndex:
                query === "" ? -1 : normalizeRichTextSlashMenuIndex(query, 0),
        },
    }
}

const moveSlashMenuSelection = (
    model: RichTextEditorModel,
    delta: number
): RichTextEditorModel => ({
    ...model,
    slashMenu: {
        ...model.slashMenu,
        activeIndex: normalizeRichTextSlashMenuIndex(
            model.slashMenu.query,
            model.slashMenu.activeIndex + delta
        ),
    },
})

const toggleMark = (
    model: RichTextEditorModel,
    markType: RichTextMarkType,
    href?: string
): RichTextEditorModel => {
    const text = richTextEditorPlainText(model)
    const selection = normalizeSelection(model.selection, text.length)
    const start = selectionStart(selection)
    const end = selectionEnd(selection)
    const markExtra = markType === "link" ? { href: href ?? "" } : undefined
    if (isSelectionCollapsed(selection)) {
        const blockSegment = blockSegmentAtOffset(model, start)
        if (blockSegment.block.type === "image") return model
        const localOffset = start - blockSegment.start
        let offset = 0
        let didInsertStoredMark = false
        const children = blockSegment.block.children.flatMap(
            (node): ReadonlyArray<RichTextTextNode> => {
                const nodeStart = offset
                const nodeEnd = nodeStart + node.text.length
                offset = nodeEnd
                if (didInsertStoredMark) return [node]
                if (localOffset < nodeStart || localOffset > nodeEnd)
                    return [node]

                didInsertStoredMark = true
                return MarkNode.insertStoredMark(
                    node,
                    localOffset - nodeStart,
                    markType,
                    markExtra
                )
            }
        )
        const nextBlock = normalizeBlock(
            blockWithChildren(blockSegment.block, children)
        )
        const blocks = model.document.children.map((block, index) =>
            index === blockSegment.index ? nextBlock : block
        )
        return normalizeModel({
            ...model,
            document: { type: "doc", children: blocks },
            selection,
        })
    }

    const blocks = model.document.children.map(
        (block, blockIndex): RichTextBlockNode => {
            if (block.type === "image") return block
            const children = textSegments(model)
                .filter((segment) => segment.blockIndex === blockIndex)
                .flatMap((segment): ReadonlyArray<RichTextTextNode> => {
                    if (end <= segment.start || start >= segment.end)
                        return [segment.node]
                    const localStart = Math.max(0, start - segment.start)
                    const localEnd = Math.min(
                        segment.node.text.length,
                        end - segment.start
                    )
                    return MarkNode.toggleRange(
                        segment.node,
                        localStart,
                        localEnd,
                        markType,
                        markExtra
                    )
                })
            return normalizeBlock({ ...block, children })
        }
    )

    return normalizeModel({
        ...model,
        document: { type: "doc", children: blocks },
    })
}

const insertImageBlock = (
    model: RichTextEditorModel,
    src: string,
    alt: string
): RichTextEditorModel => {
    const text = richTextEditorPlainText(model)
    const selection = normalizeSelection(model.selection, text.length)
    const cursor = selectionStart(selection)
    const blockSegment = blockSegmentAtOffset(model, cursor)
    const insertAtIndex = blockSegment.index + 1
    const image: RichTextBlockNode = { type: "image", src, alt }
    const children = [
        ...model.document.children.slice(0, insertAtIndex),
        image,
        ParagraphNode.create(),
        ...model.document.children.slice(insertAtIndex),
    ]
    const newCursor = blockSegment.end + 2
    return normalizeModel({
        ...model,
        document: { type: "doc", children },
        selection: collapsedSelection(newCursor),
    })
}

const updateImageAlt = (
    model: RichTextEditorModel,
    blockIndex: number,
    alt: string
): RichTextEditorModel => {
    const children = model.document.children.map((block, index) =>
        index === blockIndex && block.type === "image"
            ? { ...block, alt }
            : block
    )
    return { ...model, document: { type: "doc", children } }
}

const applySlashCommand = (
    model: RichTextEditorModel,
    value: string
): RichTextEditorModel => {
    const nextModel = closeSlashMenu(model)
    const blockFormat = richTextBlockFormatForSlashCommand(value)
    if (blockFormat) return setBlockFormat(nextModel, blockFormat)
    const markType = richTextMarkTypeForSlashCommand(value)
    return markType ? toggleMark(nextModel, markType) : nextModel
}

type UpdateReturn = readonly [
    RichTextEditorModel,
    ReadonlyArray<Command.Command<RichTextEditorMessage>>,
]

const promptForText = (
    title: string,
    label: string,
    initialValue: string | undefined
): Promise<string | null> =>
    new Promise((resolve) => {
        const dialog = document.createElement("dialog")
        const form = document.createElement("form")
        const heading = document.createElement("h2")
        const fieldLabel = document.createElement("label")
        const input = document.createElement("input")
        const actions = document.createElement("div")
        const cancel = document.createElement("button")
        const submit = document.createElement("button")
        // Production HTTPS exposes crypto.randomUUID(), but the remote HTTP
        // development host is not a secure context. randomHexId uses
        // getRandomValues there and remains suitable for DOM identifiers.
        const titleId = randomHexId()

        dialog.className =
            "m-auto w-[min(28rem,calc(100%-2rem))] rounded-[var(--radius-surface)] border border-border bg-card p-0 text-card-foreground backdrop:bg-black/50 [box-shadow:var(--shadow-overlay)]"
        form.className = "grid gap-5 p-6"
        heading.className = "text-xl font-semibold tracking-tight"
        fieldLabel.className = "grid gap-2 text-sm font-medium"
        input.className =
            "mt-2 h-10 w-full rounded-[var(--radius-control)] border border-border bg-background px-3 text-foreground outline-none focus:ring-2 focus:ring-primary/40"
        actions.className = "flex justify-end gap-2"
        cancel.className =
            "inline-flex h-10 items-center rounded-[var(--radius-control)] border border-border bg-background px-4 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        submit.className =
            "inline-flex h-10 items-center rounded-[var(--radius-control)] border border-border bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        heading.id = titleId
        heading.textContent = title
        fieldLabel.htmlFor = `${titleId}-input`
        fieldLabel.textContent = label
        input.id = fieldLabel.htmlFor
        input.value = initialValue ?? ""
        input.autofocus = true
        cancel.type = "button"
        cancel.textContent = "Cancel"
        submit.type = "submit"
        submit.textContent = "Save"
        actions.append(cancel, submit)
        form.append(heading, fieldLabel, input, actions)
        dialog.setAttribute("aria-labelledby", titleId)
        dialog.append(form)
        document.body.append(dialog)

        const close = (value: string | null) => {
            dialog.close()
            dialog.remove()
            resolve(value)
        }

        form.addEventListener("submit", (event) => {
            event.preventDefault()
            close(input.value)
        })
        cancel.addEventListener("click", () => close(null))
        dialog.addEventListener("cancel", (event) => {
            event.preventDefault()
            close(null)
        })
        dialog.showModal()
    })

const openLinkDialog = (
    model: RichTextEditorModel,
    selectedStart?: number,
    selectedEnd?: number
): UpdateReturn => {
    const plainText = richTextEditorPlainText(model)
    const selection = normalizeSelection(model.selection, plainText.length)
    const start = selectedStart ?? selectionStart(selection)
    const end = selectedEnd ?? selectionEnd(selection)
    const { model: dialog, commands = [] } = Dialog.open(
        model.linkDialog.dialog
    )
    return [
        {
            ...model,
            linkDialog: {
                dialog,
                bookmarks: Combobox.init({ id: "rich-text-editor-bookmarks" }),
                text: plainText.slice(start, end),
                href: "https://",
                selection: selectionFromRange(start, end),
            },
        },
        Command.mapMessages(commands, (message) =>
            GotLinkDialogMessage({ message })
        ),
    ]
}
const PickImage = Command.define("PickImage", {
    messages: [SelectedImageFile, CancelledImageSelection, FailedUploadImage],
    execute: Effect.gen(function* () {
        const file = yield* Effect.tryPromise<File.File | null>(
            () =>
                new Promise<File.File | null>((resolve) => {
                    const input = document.createElement("input")
                    input.type = "file"
                    input.accept = "image/*"
                    input.style.display = "none"
                    document.body.appendChild(input)
                    input.addEventListener("change", () => {
                        const selectedFile = input.files?.[0]
                        input.remove()
                        resolve(selectedFile ?? null)
                    })
                    input.addEventListener("cancel", () => {
                        input.remove()
                        resolve(null)
                    })
                    input.click()
                })
        )

        return file === null
            ? CancelledImageSelection()
            : SelectedImageFile({ file })
    }).pipe(
        Effect.catch((error) =>
            Effect.succeed(FailedUploadImage({ error: String(error) }))
        )
    ),
})

const UploadRichTextImage = Command.define("UploadRichTextImage", {
    args: { file: File.File },
    messages: [UploadedImage, FailedUploadImage],
    execute: () =>
        Effect.succeed(
            FailedUploadImage({
                error: "Image uploads require the authenticated application host.",
            })
        ),
})

const ResolveRichTextImageUrls = Command.define("ResolveRichTextImageUrls", {
    args: { urls: S.Array(S.String) },
    messages: [ResolvedRichTextImageUrls],
    execute: ({ urls }) =>
        Effect.succeed(
            ResolvedRichTextImageUrls({
                images: urls.map((stored_url) => ({
                    stored_url,
                    url: toImageSrc(stored_url),
                })),
            })
        ),
})

export const resolveRichTextImageUrls = (urls: ReadonlyArray<string>) =>
    ResolveRichTextImageUrls({ urls })

const pickImage = PickImage()

// NOTE: Rendering the document rewrites the host's text nodes, and the browser
// drops the caret when that happens — it lands at the start of the element. The
// model knows where the caret belongs, so it is put back one frame later, once
// the patch that destroyed it has been applied.
const RestoreDomSelection = Command.define("RestoreDomSelection", {
    args: { id: S.String, anchor: S.Number, focus: S.Number },
    messages: [RestoredRichTextEditorSelection],
    execute: ({ id, anchor, focus }) =>
        Effect.sync(() => {
            requestAnimationFrame(() => {
                const element = document.getElementById(id)
                if (element)
                    restoreRichTextDomSelection(element, { anchor, focus })
            })
            return RestoredRichTextEditorSelection()
        }),
})

const restoreDomSelection = (
    model: RichTextEditorModel
): ReadonlyArray<Command.Command<RichTextEditorMessage>> =>
    Option.match(model.maybeMountedHostId, {
        onNone: () => [],
        onSome: (id) => [
            RestoreDomSelection({
                id,
                anchor: model.selection.anchor,
                focus: model.selection.focus,
            }),
        ],
    })

const PromptForAltText = Command.define("PromptForAltText", {
    args: { blockIndex: S.Number, initialValue: S.String },
    messages: [SubmittedImageAlt, CancelledImageAlt],
    execute: ({ blockIndex, initialValue }) =>
        Effect.promise(
            async (): Promise<
                typeof SubmittedImageAlt.Type | typeof CancelledImageAlt.Type
            > => {
                const alt = await promptForText(
                    "Edit image alt text",
                    "Alt text",
                    initialValue
                )
                if (alt !== null) return SubmittedImageAlt({ blockIndex, alt })
                return CancelledImageAlt()
            }
        ),
})

const promptForAltText = (blockIndex: number, initialValue: string) =>
    PromptForAltText({ blockIndex, initialValue })

// NOTE: Messages the DOM already told us about. Restoring the selection for
// these would either fight the user mid-gesture or, for the restore's own
// acknowledgement, loop.
const domDrivenMessageTags: ReadonlySet<string> = new Set([
    "UpdatedRichTextEditorSelection",
    "RestoredRichTextEditorSelection",
    "MountedRichTextEditorHost",
    "FailedMountRichTextEditorHost",
])

const hasMovedCaret = (
    before: RichTextEditorModel,
    after: RichTextEditorModel,
    message: RichTextEditorMessage
): boolean =>
    !domDrivenMessageTags.has(message._tag) &&
    (before.document !== after.document ||
        before.selection.anchor !== after.selection.anchor ||
        before.selection.focus !== after.selection.focus)

const updateRichTextEditorModel = (
    model: RichTextEditorModel,
    message: RichTextEditorMessage
): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            InsertedRichTextEditorText: ({ value }) => [
                insertText(model, value),
                [],
            ],
            PastedRichTextEditorMarkdown: ({ value, start, end }) => [
                pasteMarkdown(
                    model,
                    value,
                    start === undefined || end === undefined
                        ? undefined
                        : selectionFromRange(start, end)
                ),
                [],
            ],
            SyncedRichTextEditorPlainText: ({ value, start, end }) => [
                syncPlainText(
                    model,
                    value,
                    start === undefined || end === undefined
                        ? undefined
                        : selectionFromRange(start, end)
                ),
                [],
            ],
            DeletedRichTextEditorBackward: ({ start, end, unit }) => [
                deleteBackward(
                    model,
                    start === undefined || end === undefined
                        ? undefined
                        : selectionFromRange(start, end),
                    unit
                ),
                [],
            ],
            SplitRichTextEditorBlock: () => [splitBlock(model), []],
            SelectedRichTextEditorAll: () => {
                const textLength = richTextEditorPlainText(model).length
                return [
                    { ...model, selection: selectionFromRange(0, textLength) },
                    [],
                ]
            },
            RestoredRichTextEditorSelection: () => [model, []],
            MountedRichTextEditorHost: ({ id }) => [
                { ...model, maybeMountedHostId: Option.some(id) },
                [],
            ],
            FailedMountRichTextEditorHost: () => [model, []],
            UpdatedRichTextEditorSelection: (selection) => [
                {
                    ...model,
                    selection: normalizeSelection(
                        selectionFromRange(selection.start, selection.end),
                        richTextEditorPlainText(model).length
                    ),
                },
                [],
            ],
            OpenedRichTextEditorSlashMenu: () => [openSlashMenu(model), []],
            ClosedRichTextEditorSlashMenu: () => [closeSlashMenu(model), []],
            UpdatedRichTextEditorSlashMenuQuery: ({ value }) => [
                updateSlashMenuQuery(model, value),
                [],
            ],
            MovedRichTextEditorSlashMenuSelection: ({ delta }) => [
                moveSlashMenuSelection(model, delta),
                [],
            ],
            SelectedRichTextEditorSlashCommand: ({ value }) =>
                value === "link"
                    ? (() => {
                          const closedModel = closeSlashMenu(model)
                          return openLinkDialog(closedModel)
                      })()
                    : value === "image"
                      ? [closeSlashMenu(model), [pickImage]]
                      : [applySlashCommand(model, value), []],
            SelectedRichTextEditorBlockFormat: ({ type, level }) => [
                setBlockFormat(model, { type, level }),
                [],
            ],
            ClickedRichTextEditorMark: ({ type, start, end }) => {
                if (type === "link") {
                    return openLinkDialog(model, start, end)
                }
                return [toggleMark(model, type), []]
            },
            SubmittedLinkUrl: ({ href, text, start, end }) => {
                const { model: dialog, commands: dialogCommands = [] } =
                    Dialog.close(model.linkDialog.dialog)
                const modelWithOriginalSelection = {
                    ...model,
                    linkDialog: { ...model.linkDialog, dialog },
                    selection: selectionFromRange(start, end),
                }
                const insertedModel = insertText(
                    modelWithOriginalSelection,
                    text
                )
                const linkedModel = toggleMark(
                    {
                        ...insertedModel,
                        selection: selectionFromRange(
                            start,
                            start + text.length
                        ),
                    },
                    "link",
                    href
                )
                const linkedModelAtEnd = {
                    ...linkedModel,
                    selection: collapsedSelection(start + text.length),
                }
                const nextModel = toggleMark(linkedModelAtEnd, "link", href)
                return [
                    nextModel,
                    Command.mapMessages(dialogCommands, (message) =>
                        GotLinkDialogMessage({ message })
                    ),
                ]
            },
            CancelledLinkUrl: () => {
                const { model: dialog, commands = [] } = Dialog.close(
                    model.linkDialog.dialog
                )
                return [
                    { ...model, linkDialog: { ...model.linkDialog, dialog } },
                    Command.mapMessages(commands, (message) =>
                        GotLinkDialogMessage({ message })
                    ),
                ]
            },
            GotLinkDialogMessage: ({ message }) => {
                const { model: dialog, commands = [] } = Dialog.update(
                    model.linkDialog.dialog,
                    message
                )
                return [
                    { ...model, linkDialog: { ...model.linkDialog, dialog } },
                    Command.mapMessages(commands, (nextMessage) =>
                        GotLinkDialogMessage({ message: nextMessage })
                    ),
                ]
            },
            GotLinkBookmarksMessage: ({ message, title }) => {
                const {
                    model: bookmarks,
                    commands = [],
                    outMessage,
                } = BookmarkCombobox.update(model.linkDialog.bookmarks, message)
                const selected = outMessage?._tag === "Selected"
                return [
                    {
                        ...model,
                        linkDialog: {
                            ...model.linkDialog,
                            bookmarks,
                            ...(selected
                                ? { href: outMessage.value, text: title }
                                : {}),
                        },
                    },
                    Command.mapMessages(commands, (message) =>
                        GotLinkBookmarksMessage({ message, title })
                    ),
                ]
            },
            UpdatedLinkText: ({ value }) => [
                {
                    ...model,
                    linkDialog: { ...model.linkDialog, text: value },
                },
                [],
            ],
            UpdatedLinkHref: ({ value }) => [
                {
                    ...model,
                    linkDialog: { ...model.linkDialog, href: value },
                },
                [],
            ],
            SelectedLinkSuggestion: ({ title, href }) => [
                {
                    ...model,
                    linkDialog: {
                        ...model.linkDialog,
                        href,
                        text: title,
                    },
                },
                [],
            ],
            ClickedRichTextEditorImage: () => [model, [pickImage]],
            SelectedImageFile: ({ file }) => [
                model,
                [UploadRichTextImage({ file })],
            ],
            CancelledImageSelection: () => [model, []],
            UploadedImage: ({ src, alt, resolved_src }) => {
                const with_image = insertImageBlock(model, src, alt)

                return resolved_src === undefined
                    ? [with_image, [resolveRichTextImageUrls([src])]]
                    : [
                          {
                              ...with_image,
                              resolved_image_urls: [
                                  ...model.resolved_image_urls.filter(
                                      (image) => image.stored_url !== src
                                  ),
                                  { stored_url: src, url: resolved_src },
                              ],
                          },
                          [],
                      ]
            },
            ResolvedRichTextImageUrls: ({ images }) => [
                {
                    ...model,
                    resolved_image_urls: [
                        ...model.resolved_image_urls.filter(
                            (current) =>
                                !images.some(
                                    (image) =>
                                        image.stored_url === current.stored_url
                                )
                        ),
                        ...images,
                    ],
                },
                [],
            ],
            FailedUploadImage: () => [model, []],
            ClickedEditImageAlt: ({ blockIndex }) => {
                const block = model.document.children[blockIndex]

                return block?.type === "image"
                    ? [model, [promptForAltText(blockIndex, block.alt)]]
                    : [model, []]
            },
            SubmittedImageAlt: ({ blockIndex, alt }) => [
                updateImageAlt(model, blockIndex, alt),
                [],
            ],
            CancelledImageAlt: () => [model, []],
            MovedRichTextEditorBlock: ({ fromIndex, toIndex }) => {
                if (fromIndex === toIndex) return [model, []]
                const block = model.document.children[fromIndex]
                if (block === undefined) return [model, []]
                const adjustedToIndex =
                    fromIndex < toIndex ? toIndex - 1 : toIndex
                const children = [
                    ...model.document.children.slice(0, fromIndex),
                    ...model.document.children.slice(fromIndex + 1),
                ]
                const reordered = [
                    ...children.slice(0, adjustedToIndex),
                    block,
                    ...children.slice(adjustedToIndex),
                ]
                return [
                    {
                        ...model,
                        document: { ...model.document, children: reordered },
                    },
                    [],
                ]
            },
            AddedRichTextEditorBlock: ({ afterIndex }) => {
                const insertIndex = afterIndex + 1
                const cursor = model.document.children
                    .slice(0, insertIndex)
                    .reduce((acc, b) => acc + blockText(b).length + 1, 0)
                const children = [
                    ...model.document.children.slice(0, insertIndex),
                    ParagraphNode.create(),
                    ...model.document.children.slice(insertIndex),
                ]
                return [
                    {
                        ...model,
                        document: { ...model.document, children },
                        selection: collapsedSelection(cursor),
                    },
                    [],
                ]
            },
            GotRichTextDragAndDropMessage: ({ message: dragMessage }) => {
                const {
                    model: nextDragAndDrop,
                    commands: dragCommands = [],
                    outMessage: maybeOutMessage_value,
                } = DragAndDrop.update(model.dragAndDrop, dragMessage)
                const maybeOutMessage = Option.fromUndefinedOr(
                    maybeOutMessage_value
                )

                const mappedCommands = dragCommands.map(
                    Command.mapEffect(
                        Effect.map(
                            (innerMessage): RichTextEditorMessage =>
                                GotRichTextDragAndDropMessage({
                                    message: innerMessage,
                                })
                        )
                    )
                )

                return Option.match(maybeOutMessage, {
                    onNone: () => [
                        { ...model, dragAndDrop: nextDragAndDrop },
                        mappedCommands,
                    ],
                    onSome: (outMessage) =>
                        M.value(outMessage).pipe(
                            M.withReturnType<UpdateReturn>(),
                            M.tagsExhaustive({
                                Reordered: ({ fromIndex, toIndex }) => {
                                    const modelWithDnd = {
                                        ...model,
                                        dragAndDrop: nextDragAndDrop,
                                    }
                                    const [reorderedModel, reorderCommands] =
                                        updateRichTextEditor(
                                            modelWithDnd,
                                            MovedRichTextEditorBlock({
                                                fromIndex,
                                                toIndex,
                                            })
                                        )
                                    return [
                                        reorderedModel,
                                        [...mappedCommands, ...reorderCommands],
                                    ]
                                },
                                Cancelled: () => [
                                    { ...model, dragAndDrop: nextDragAndDrop },
                                    mappedCommands,
                                ],
                            })
                        ),
                })
            },
        })
    )

// NOTE: Typing is intercepted on keydown and applied to the model, not to the
// DOM — the browser's own insertion is prevented. Re-rendering then rewrites the
// host's text nodes, which drops the caret to the start of the element, so every
// update that moves the caret has to put it back afterwards.
export const updateRichTextEditor = (
    model: RichTextEditorModel,
    message: RichTextEditorMessage
): UpdateReturn => {
    const [next, commands] = updateRichTextEditorModel(model, message)
    if (!hasMovedCaret(model, next, message)) return [next, commands]

    return [next, [...commands, ...restoreDomSelection(next)]]
}

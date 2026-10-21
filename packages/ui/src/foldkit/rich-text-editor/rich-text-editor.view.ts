import { Effect, Option, pipe } from "effect"
import { Mount } from "foldkit"
import { Combobox, Dialog, DragAndDrop } from "@foldkit/ui"
import type { Attribute, Html, HtmlBuilder } from "foldkit/html"
import { Button } from "../button/button.view.ts"
import {
    IconBold,
    IconChevronDown,
    IconCopy,
    IconGripVertical,
    IconHeading1,
    IconHeading2,
    IconHeading3,
    IconImage,
    IconItalic,
    IconLink,
    IconMessageSquare,
    IconPencil,
    IconPlus,
} from "../icons/view.ts"
import {
    blockText,
    isSelectionCollapsed,
    selectionEnd,
    selectionStart,
} from "./rich-text-editor.document.ts"
import { restoreRichTextDomSelection } from "./rich-text-editor.dom.ts"
import { richTextEditorMarkdown } from "./rich-text-editor.markdown.ts"
import {
    initRichTextEditor,
    richTextEditorPlainText,
    unmountRichTextEditorHost,
} from "./rich-text-editor.model.ts"
import {
    ParagraphNode,
    ImageNode,
    richTextBlockToolbarItems,
    richTextMarkClassNameForMarks,
    richTextMarkToolbarItems,
    richTextRenderBlock,
} from "./rich-text-editor.registry.ts"
import {
    UpdatedRichTextEditorSelection,
    AddedRichTextEditorBlock,
    ClosedRichTextEditorSlashMenu,
    DeletedRichTextEditorBackward,
    FailedMountRichTextEditorHost,
    GotRichTextDragAndDropMessage,
    InsertedRichTextEditorText,
    MountedRichTextEditorHost,
    MovedRichTextEditorSlashMenuSelection,
    OpenedRichTextEditorSlashMenu,
    PastedRichTextEditorMarkdown,
    RestoredRichTextEditorSelection,
    RichTextEditorMessage,
    SelectedRichTextEditorBlockFormat,
    SplitRichTextEditorBlock,
    SyncedRichTextEditorPlainText,
    SelectedRichTextEditorAll,
    SelectedRichTextEditorSlashCommand,
    ClickedRichTextEditorMark,
    ClickedEditImageAlt,
    ClickedRichTextEditorImage,
    CancelledImageSelection,
    FailedUploadImage,
    SubmittedLinkUrl,
    CancelledLinkUrl,
    GotLinkDialogMessage,
    UpdatedLinkText,
    UpdatedLinkHref,
    GotLinkBookmarksMessage,
    SelectedLinkSuggestion,
    UploadedImage,
    ResolvedRichTextImageUrls,
    UpdatedRichTextEditorSlashMenuQuery,
    type RichTextEditorModel,
    type RichTextBlockNode,
    type RichTextSelection,
    type RichTextTextNode,
} from "./rich-text-editor.schema.ts"
import type { RichTextMarkType } from "./nodes/mark.schema.ts"
import { RichTextEditorSlashMenu } from "./rich-text-editor.slash-menu.view.ts"
import {
    richTextEditorSubscriptions,
    type RichTextEditorSubscriptionOptions,
} from "./rich-text-editor.subscriptions.ts"
import {
    resolveRichTextImageUrls,
    updateRichTextEditor,
} from "./rich-text-editor.update.ts"

const editorSurfaceClassName =
    "@container/rich-text-editor grid min-w-0 w-full gap-4 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border/60 bg-card/95 p-4 text-card-foreground [box-shadow:var(--shadow-surface)] backdrop-blur-sm"

const toolbarClassName =
    "flex flex-wrap items-center gap-1.5 rounded-full border-(length:--surface-border-width) border-border/60 bg-background/90 p-1.5 [box-shadow:var(--shadow-surface)] backdrop-blur"

const toolbarButtonClassName =
    "inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"

const toolbarButtonActiveClassName =
    "inline-flex size-8 items-center justify-center rounded-full bg-accent text-accent-foreground [box-shadow:var(--shadow-control)] border-(length:--control-border-width) border-border"

const contentEditorClassName =
    "rte-editor relative mx-auto min-h-[38rem] min-w-0 w-full max-w-[760px] rounded-[var(--radius-surface)] bg-transparent px-0 py-6 text-[15px] leading-7 text-foreground outline-none transition-colors empty:before:text-muted-foreground/55 empty:before:content-[attr(data-placeholder)] focus-visible:ring-0 data-disabled:cursor-not-allowed data-disabled:opacity-50 @min-[32rem]/rich-text-editor:px-8 @min-[32rem]/rich-text-editor:py-12 @min-[40rem]/rich-text-editor:px-12"

const blockHandleClassName =
    "flex h-full items-center justify-end opacity-0 transition-opacity group-hover:opacity-100"

const blockHandleButtonClassName =
    "flex size-7 items-center justify-center rounded-full text-muted-foreground/75 transition-colors hover:bg-accent hover:text-accent-foreground cursor-grab active:cursor-grabbing"

const blockAddButtonClassName =
    "flex size-7 items-center justify-center rounded-full text-muted-foreground/75 transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer"

const blockRowClassName =
    "group grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-3 items-center"

const blockContentClassName = (isDragged: boolean): string =>
    isDragged
        ? "min-w-0 rounded-[var(--radius-surface-sm)] border-(length:--surface-border-width) border-primary/35 bg-background px-2 py-3 [box-shadow:var(--shadow-surface)] @min-[32rem]/rich-text-editor:px-4"
        : "min-w-0 rounded-[var(--radius-surface-sm)] px-2 py-3 transition-colors group-hover:bg-muted/20 @min-[32rem]/rich-text-editor:px-4"

const dropIndicatorClassName =
    "col-start-2 h-0.5 rounded-full bg-primary/45 [box-shadow:var(--shadow-control)]"

const editorSectionClassName =
    "relative grid min-w-0 gap-4 rounded-[var(--radius-frame)] border-(length:--surface-border-width) border-border/60 bg-background/95 px-2 py-4 [box-shadow:var(--shadow-surface)] @min-[32rem]/rich-text-editor:px-6 @min-[32rem]/rich-text-editor:py-6"

export {
    UpdatedRichTextEditorSelection,
    ClosedRichTextEditorSlashMenu,
    DeletedRichTextEditorBackward,
    FailedMountRichTextEditorHost,
    InsertedRichTextEditorText,
    MountedRichTextEditorHost,
    MovedRichTextEditorSlashMenuSelection,
    OpenedRichTextEditorSlashMenu,
    PastedRichTextEditorMarkdown,
    RestoredRichTextEditorSelection,
    RichTextEditorMessage,
    SelectedRichTextEditorAll,
    SelectedRichTextEditorSlashCommand,
    SelectedRichTextEditorBlockFormat,
    SplitRichTextEditorBlock,
    SyncedRichTextEditorPlainText,
    ClickedRichTextEditorMark,
    ClickedRichTextEditorImage,
    CancelledImageSelection,
    FailedUploadImage,
    SubmittedLinkUrl,
    CancelledLinkUrl,
    GotLinkDialogMessage,
    UpdatedLinkText,
    UpdatedLinkHref,
    GotLinkBookmarksMessage,
    SelectedLinkSuggestion,
    UploadedImage,
    ResolvedRichTextImageUrls,
    resolveRichTextImageUrls,
    UpdatedRichTextEditorSlashMenuQuery,
    initRichTextEditor,
    richTextEditorPlainText,
    richTextEditorSubscriptions,
    unmountRichTextEditorHost,
    updateRichTextEditor,
}
export type { RichTextEditorModel, RichTextEditorSubscriptionOptions }

export type LinkSuggestion = Readonly<{
    id: string
    title: string
    href: string
    tags: ReadonlyArray<string>
}>

export type RichTextEditorProps<Message> = Readonly<{
    id: string
    model: RichTextEditorModel
    toParentMessage: (message: RichTextEditorMessage) => Message
    label?: string
    description?: string
    placeholder?: string
    rows?: number
    isDisabled?: boolean | undefined
    isSlashMenuBackdropDisabled?: boolean | undefined
    isDebugSelectionVisible?: boolean
    attributes?: ReadonlyArray<Attribute<Message>>
    linkSuggestions?: ReadonlyArray<LinkSuggestion>
}>

const mountRichTextEditorHost = <Message>({
    id,
    selection,
    toParentMessage,
}: Readonly<{
    id: string
    selection: RichTextSelection
    toParentMessage: (message: RichTextEditorMessage) => Message
}>) => {
    return Mount.mapMessage(
        Mount.define("MountRichTextEditorHost", {
            messages: [
                MountedRichTextEditorHost,
                FailedMountRichTextEditorHost,
            ],
            execute: ({ element }) =>
                element instanceof HTMLElement
                    ? Effect.acquireRelease(
                          Effect.sync(() => {
                              Object.defineProperty(element, "value", {
                                  configurable: true,
                                  get: () => element.innerText,
                              })

                              requestAnimationFrame(() => {
                                  restoreRichTextDomSelection(
                                      element,
                                      selection,
                                      false
                                  )
                              })

                              return () => {
                                  delete (element as { value?: string }).value
                              }
                          }),
                          (cleanup) => Effect.sync(cleanup)
                      ).pipe(Effect.as(MountedRichTextEditorHost({ id })))
                    : Effect.succeed(
                          FailedMountRichTextEditorHost({
                              reason: "Rich text editor host is not an HTMLElement.",
                          })
                      ),
        })(),
        toParentMessage
    )
}

const mountRichTextEditorCopyMarkdownButton = <Message>(
    toParentMessage: (message: RichTextEditorMessage) => Message
) => {
    return Mount.mapMessage(
        Mount.define("MountRichTextEditorCopyMarkdownButton", {
            messages: [
                RestoredRichTextEditorSelection,
                FailedMountRichTextEditorHost,
            ],
            execute: ({ element }) =>
                element instanceof HTMLElement
                    ? Effect.acquireRelease(
                          Effect.sync(() => {
                              const onClick = () => {
                                  void navigator.clipboard?.writeText(
                                      element.dataset.rteMarkdown ?? ""
                                  )
                              }

                              element.addEventListener("click", onClick)

                              return () =>
                                  element.removeEventListener("click", onClick)
                          }),
                          (cleanup) => Effect.sync(cleanup)
                      ).pipe(Effect.as(RestoredRichTextEditorSelection()))
                    : Effect.succeed(
                          FailedMountRichTextEditorHost({
                              reason: "Rich text editor copy markdown button is not an HTMLElement.",
                          })
                      ),
        })(),
        toParentMessage
    )
}

const renderBlockInlineContent = <Message>(
    {
        block,
        blockStart,
        selection,
    }: Readonly<{
        block: RichTextBlockNode
        blockStart: number
        selection: RichTextSelection
    }>,
    h: HtmlBuilder<Message>
): ReadonlyArray<Html | string> => {
    if (block.type === "image") return []
    let textOffset = blockStart

    return block.children.flatMap((node, inlineIndex) => {
        const rendered = ParagraphNode.renderTextNode<Message>(
            {
                node,
                index: inlineIndex,
                start: textOffset,
                selection,
                markClassNameForMarks: richTextMarkClassNameForMarks,
            },
            h
        )
        textOffset += node.text.length
        return rendered
    })
}

const renderEmptyBlockFallback = <Message>(
    {
        blockIndex,
        blockStart,
        placeholder,
    }: Readonly<{
        blockIndex: number
        blockStart: number
        placeholder: string
    }>,
    h: HtmlBuilder<Message>
): Html => {
    if (blockIndex === 0) {
        return ParagraphNode.renderPlaceholder<Message>(
            {
                placeholder,
                start: blockStart,
                className: "text-muted-foreground/55",
            },
            h
        )
    }
    return ParagraphNode.renderPlaceholder<Message>(
        {
            placeholder: "",
            start: blockStart,
            className: "whitespace-pre",
        },
        h
    )
}

const renderBlockHandle = <Message>(
    blockIndex: number,
    toParentMessage: (message: RichTextEditorMessage) => Message,
    model: RichTextEditorModel,
    hDiv: HtmlBuilder<Message>
): Html => {
    const dndAttrs = DragAndDrop.draggable<Message>(
        {
            model: model.dragAndDrop,
            toParentMessage: (msg) =>
                toParentMessage(
                    GotRichTextDragAndDropMessage({ message: msg })
                ),
            itemId: String(blockIndex),
            containerId: "rich-text-editor",
            index: blockIndex,
        },
        hDiv
    )
    return hDiv.div(
        [hDiv.Class(blockHandleClassName)],
        [
            hDiv.div(
                [
                    ...dndAttrs,
                    hDiv.Class(
                        "rounded-full border-(length:--surface-border-width) border-border/70 bg-background/95 p-1 [box-shadow:var(--shadow-surface)] backdrop-blur"
                    ),
                ],
                [IconGripVertical({ class: blockHandleButtonClassName })]
            ),
            hDiv.div(
                [
                    hDiv.OnClick(
                        toParentMessage(
                            AddedRichTextEditorBlock({ afterIndex: blockIndex })
                        )
                    ),
                    hDiv.Class(
                        "rounded-full border-(length:--control-outline-border-width) border-transparent p-1 text-muted-foreground/75 transition-colors hover:border-border/70 hover:bg-accent hover:text-accent-foreground"
                    ),
                ],
                [IconPlus({ class: blockAddButtonClassName })]
            ),
        ]
    )
}

const renderDropIndicator = <Message>(hDiv: HtmlBuilder<Message>): Html => {
    return hDiv.div(
        [
            hDiv.Class(
                "grid grid-cols-[2.75rem_minmax(0,1fr)] items-center py-1"
            ),
        ],
        [hDiv.div([], []), hDiv.div([hDiv.Class(dropIndicatorClassName)], [])]
    )
}

const renderBlockNode = <Message>(
    {
        block,
        blockIndex,
        blockStart,
        selection,
        placeholder,
        append,
        toParentMessage,
        model,
    }: Readonly<{
        block: RichTextBlockNode
        blockIndex: number
        blockStart: number
        selection: RichTextSelection
        placeholder: string
        append?: ReadonlyArray<Html> | undefined
        toParentMessage: (message: RichTextEditorMessage) => Message
        model: RichTextEditorModel
    }>,
    hDiv: HtmlBuilder<Message>
): Html => {
    const handle = renderBlockHandle<Message>(
        blockIndex,
        toParentMessage,
        model,
        hDiv
    )
    const isDragged =
        DragAndDrop.isDragging(model.dragAndDrop) &&
        Option.exists(
            DragAndDrop.maybeDraggedItemId(model.dragAndDrop),
            (id) => id === String(blockIndex)
        )
    const blockClasses = blockContentClassName(isDragged)
    if (block.type === "image") {
        return hDiv.div(
            [
                hDiv.Attribute("data-block-index", String(blockIndex)),
                hDiv.Class(blockRowClassName),
            ],
            [
                handle,
                hDiv.div(
                    [hDiv.Class(blockClasses)],
                    [
                        ImageNode.render<Message>(
                            block,
                            blockIndex,
                            (index) =>
                                toParentMessage(
                                    ClickedEditImageAlt({
                                        blockIndex: index,
                                    })
                                ),
                            hDiv,
                            model.resolved_image_urls.find(
                                (image) => image.stored_url === block.src
                            )?.url
                        ),
                    ]
                ),
            ]
        )
    }
    const blockContent =
        blockText(block).length > 0
            ? renderBlockInlineContent<Message>(
                  { block, blockStart, selection },
                  hDiv
              )
            : [
                  renderEmptyBlockFallback<Message>(
                      { blockIndex, blockStart, placeholder },
                      hDiv
                  ),
                  ...(append ?? []),
              ]

    return hDiv.div(
        [
            hDiv.Attribute("data-block-index", String(blockIndex)),
            hDiv.Class(blockRowClassName),
        ],
        [
            handle,
            hDiv.div(
                [hDiv.Class(blockClasses)],
                [richTextRenderBlock<Message>(block, blockContent, hDiv)]
            ),
        ]
    )
}

const renderDocument = <Message>(
    {
        blocks,
        selection,
        placeholder,
        hint,
        toParentMessage,
        model,
    }: Readonly<{
        blocks: ReadonlyArray<RichTextBlockNode>
        selection: RichTextSelection
        placeholder: string
        hint?: Html | undefined
        toParentMessage: (message: RichTextEditorMessage) => Message
        model: RichTextEditorModel
    }>,
    h: HtmlBuilder<Message>
): ReadonlyArray<Html> => {
    const maybeTarget = Option.flatMap(
        DragAndDrop.maybeDropTarget(model.dragAndDrop),
        (target) =>
            target.containerId === "rich-text-editor"
                ? Option.some(target.index)
                : Option.none()
    )
    let blockStart = 0
    const renderedBlocks: Array<Html> = []
    blocks.forEach((block, blockIndex) => {
        const isLast = blockIndex === blocks.length - 1
        if (
            Option.exists(
                maybeTarget,
                (targetIndex) => targetIndex === blockIndex
            )
        ) {
            renderedBlocks.push(renderDropIndicator<Message>(h))
        }
        const rendered = renderBlockNode<Message>(
            {
                block,
                blockIndex,
                blockStart,
                selection,
                placeholder,
                append:
                    isLast &&
                    blockText(block).length === 0 &&
                    blockIndex > 0 &&
                    hint
                        ? [hint]
                        : undefined,
                toParentMessage,
                model,
            },
            h
        )
        renderedBlocks.push(rendered)
        blockStart += blockText(block).length + 1
    })
    if (
        Option.exists(
            maybeTarget,
            (targetIndex) => targetIndex === blocks.length
        )
    ) {
        renderedBlocks.push(renderDropIndicator<Message>(h))
    }
    return renderedBlocks
}

const markToolbarMessage = (
    type: RichTextMarkType,
    model: RichTextEditorModel
): RichTextEditorMessage =>
    ClickedRichTextEditorMark({
        type,
        start: selectionStart(model.selection),
        end: selectionEnd(model.selection),
    })

const isMarkActive = (
    model: RichTextEditorModel,
    type: RichTextMarkType
): boolean => {
    const selection = model.selection
    const selectedBlocks = model.document.children.filter(
        (
            block
        ): block is typeof block & {
            children: ReadonlyArray<RichTextTextNode>
        } => block.type !== "image" && blockText(block).length > 0
    )
    return (
        selectedBlocks.some((block) =>
            block.children.some(
                (node) =>
                    node.marks?.some((mark) => mark.type === type) ?? false
            )
        ) && !isSelectionCollapsed(selection)
    )
}

const ghostView = <Message>(
    model: RichTextEditorModel,
    h: HtmlBuilder<Message>
): Html => {
    return Option.match(DragAndDrop.ghostStyle(model.dragAndDrop), {
        onNone: () => h.empty,
        onSome: (style) =>
            pipe(
                DragAndDrop.maybeDraggedItemId(model.dragAndDrop),
                Option.flatMap((itemId) => {
                    const index = parseInt(itemId, 10)
                    if (isNaN(index)) return Option.none()
                    const block = model.document.children[index]
                    return block ? Option.some(block) : Option.none()
                }),
                Option.match({
                    onNone: () => h.empty,
                    onSome: (block) =>
                        h.div(
                            [
                                h.Style(style),
                                h.Class(
                                    "rounded-[var(--radius-surface-sm)] border-(length:--surface-border-width) border-border/70 bg-background/95 px-4 py-3 text-[15px] leading-7 [box-shadow:var(--shadow-overlay)] backdrop-blur"
                                ),
                            ],
                            [
                                block.type === "image"
                                    ? block.alt || "Image"
                                    : blockText(block),
                            ]
                        ),
                })
            ),
    })
}

const isAllowedLinkHref = (value: string): boolean => {
    const href = value.trim()
    if (href.length === 0) return false
    if (
        href.startsWith("/") ||
        href.startsWith("./") ||
        href.startsWith("../") ||
        href.startsWith("#")
    ) {
        return true
    }
    try {
        const url = new URL(href)
        return (
            url.protocol === "http:" ||
            url.protocol === "https:" ||
            url.protocol === "mailto:" ||
            url.protocol === "tel:"
        )
    } catch {
        return false
    }
}

const BookmarkCombobox = Combobox.create<string>()

const matchingLinkSuggestions = (
    suggestions: ReadonlyArray<LinkSuggestion>,
    search: string
): ReadonlyArray<LinkSuggestion> => {
    const query = search.trim().toLocaleLowerCase()
    if (query.length === 0) return suggestions
    return suggestions.filter((suggestion) =>
        [suggestion.title, suggestion.href, ...suggestion.tags].some((value) =>
            value.toLocaleLowerCase().includes(query)
        )
    )
}

const linkDialogView = <Message>(
    props: RichTextEditorProps<Message>,
    h: HtmlBuilder<Message>
): Html => {
    const link_dialog = props.model.linkDialog
    const suggestions = matchingLinkSuggestions(
        props.linkSuggestions ?? [],
        link_dialog.bookmarks.inputValue
    )
    const href = link_dialog.href.trim()
    const text = link_dialog.text.trim() || href
    const submit = props.toParentMessage(
        SubmittedLinkUrl({
            href,
            text,
            start: selectionStart(link_dialog.selection),
            end: selectionEnd(link_dialog.selection),
        })
    )
    const to_dialog_message = (message: Dialog.Message) =>
        props.toParentMessage(GotLinkDialogMessage({ message }))

    return h.submodel({
        slotId: link_dialog.dialog.id,
        model: link_dialog.dialog,
        view: Dialog.view,
        viewInputs: {
            toView: (render) =>
                h.dialog(
                    [
                        ...render.dialog,
                        h.Class(
                            "bg-transparent p-0 open:flex items-center justify-center"
                        ),
                    ],
                    render.isVisible
                        ? [
                              h.div(
                                  [
                                      ...render.backdrop,
                                      h.Class("fixed inset-0 bg-black/50"),
                                  ],
                                  []
                              ),
                              h.form(
                                  [
                                      ...render.panel,
                                      h.OnSubmit(submit),
                                      h.Class(
                                          "relative z-10 grid max-h-[min(46rem,calc(100dvh-2rem))] w-[min(34rem,calc(100vw-2rem))] gap-5 overflow-y-auto overscroll-contain rounded-[var(--radius-surface)] border border-border bg-card p-6 text-card-foreground [box-shadow:var(--shadow-overlay)]"
                                      ),
                                  ],
                                  [
                                      h.div(
                                          [h.Class("grid gap-1")],
                                          [
                                              h.h2(
                                                  [
                                                      ...render.title,
                                                      h.Class(
                                                          "text-xl font-semibold tracking-tight"
                                                      ),
                                                  ],
                                                  ["Add link"]
                                              ),
                                              h.p(
                                                  [
                                                      ...render.description,
                                                      h.Class(
                                                          "text-sm text-muted-foreground"
                                                      ),
                                                  ],
                                                  [
                                                      "Link selected text or choose a saved bookmark.",
                                                  ]
                                              ),
                                          ]
                                      ),
                                      h.label(
                                          [
                                              h.Class(
                                                  "grid gap-2 text-sm font-medium"
                                              ),
                                          ],
                                          [
                                              "Link text",
                                              h.input([
                                                  ...render.initialFocus,
                                                  h.Id(
                                                      "rich-text-editor-link-text"
                                                  ),
                                                  h.Value(link_dialog.text),
                                                  h.Placeholder(
                                                      "Visible link text"
                                                  ),
                                                  h.OnInput((value) =>
                                                      props.toParentMessage(
                                                          UpdatedLinkText({
                                                              value,
                                                          })
                                                      )
                                                  ),
                                                  h.Class(
                                                      "h-10 min-w-0 w-full rounded-[var(--radius-control)] border border-border bg-background px-3 text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                                                  ),
                                              ]),
                                          ]
                                      ),
                                      h.label(
                                          [
                                              h.Class(
                                                  "grid gap-2 text-sm font-medium"
                                              ),
                                          ],
                                          [
                                              "URL",
                                              h.input([
                                                  h.Value(link_dialog.href),
                                                  h.Placeholder(
                                                      "https://example.com"
                                                  ),
                                                  h.Attribute(
                                                      "inputmode",
                                                      "url"
                                                  ),
                                                  h.OnInput((value) =>
                                                      props.toParentMessage(
                                                          UpdatedLinkHref({
                                                              value,
                                                          })
                                                      )
                                                  ),
                                                  h.Class(
                                                      "h-10 min-w-0 w-full rounded-[var(--radius-control)] border border-border bg-background px-3 text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                                                  ),
                                              ]),
                                          ]
                                      ),
                                      h.div(
                                          [
                                              h.Class(
                                                  "grid gap-2 border-t border-border pt-4"
                                              ),
                                          ],
                                          [
                                              h.label(
                                                  [
                                                      h.For(
                                                          Combobox.inputId(
                                                              link_dialog
                                                                  .bookmarks.id
                                                          )
                                                      ),
                                                      h.Class(
                                                          "text-sm font-medium"
                                                      ),
                                                  ],
                                                  ["Bookmarks"]
                                              ),
                                              h.submodel({
                                                  slotId: link_dialog.bookmarks
                                                      .id,
                                                  model: link_dialog.bookmarks,
                                                  view: BookmarkCombobox.view,
                                                  viewInputs: {
                                                      items: suggestions.map(
                                                          (item) => item.href
                                                      ),
                                                      maybeSelectedValue:
                                                          Option.some(
                                                              link_dialog.href
                                                          ),
                                                      restingInputValue: "",
                                                      itemToValue: (href) =>
                                                          href,
                                                      itemToDisplayText: (
                                                          href
                                                      ) =>
                                                          props.linkSuggestions?.find(
                                                              (item) =>
                                                                  item.href ===
                                                                  href
                                                          )?.title ?? href,
                                                      itemToConfig: (href) => ({
                                                          className:
                                                              "grid min-w-0 cursor-pointer gap-0.5 rounded-[var(--radius-control)] px-3 py-2 text-start data-[active]:bg-accent data-[active]:text-accent-foreground",
                                                          content: h.div(
                                                              [
                                                                  h.Class(
                                                                      "grid min-w-0 gap-0.5"
                                                                  ),
                                                              ],
                                                              [
                                                                  h.span(
                                                                      [
                                                                          h.Class(
                                                                              "truncate text-sm font-medium"
                                                                          ),
                                                                      ],
                                                                      [
                                                                          props.linkSuggestions?.find(
                                                                              (
                                                                                  item
                                                                              ) =>
                                                                                  item.href ===
                                                                                  href
                                                                          )
                                                                              ?.title ??
                                                                              href,
                                                                      ]
                                                                  ),
                                                                  h.span(
                                                                      [
                                                                          h.Class(
                                                                              "truncate text-xs text-muted-foreground"
                                                                          ),
                                                                      ],
                                                                      [href]
                                                                  ),
                                                              ]
                                                          ),
                                                      }),
                                                      inputPlaceholder:
                                                          "Search bookmarks",
                                                      inputClassName:
                                                          "h-10 w-full rounded-[var(--radius-control)] border border-border bg-background pl-3 pr-10 text-sm outline-none focus:ring-2 focus:ring-primary/40",
                                                      inputWrapperClassName:
                                                          "relative",
                                                      buttonContent:
                                                          IconChevronDown({
                                                              class: "size-4",
                                                          }),
                                                      buttonClassName:
                                                          "absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground",
                                                      itemsClassName:
                                                          "z-50 w-(--button-width) rounded-[var(--radius-surface)] border border-border bg-card p-1 text-card-foreground [box-shadow:var(--shadow-overlay)]",
                                                      itemsScrollClassName:
                                                          "max-h-60 overflow-y-auto overscroll-contain",
                                                      backdropClassName:
                                                          "fixed inset-0 z-40",
                                                      anchor: {
                                                          portal: false,
                                                          gap: 4,
                                                      },
                                                  },
                                                  toParentMessage: (message) =>
                                                      props.toParentMessage(
                                                          GotLinkBookmarksMessage(
                                                              {
                                                                  message,
                                                                  title:
                                                                      message._tag ===
                                                                      "SelectedItem"
                                                                          ? (props.linkSuggestions?.find(
                                                                                (
                                                                                    item
                                                                                ) =>
                                                                                    item.href ===
                                                                                    message.item
                                                                            )
                                                                                ?.title ??
                                                                            message.item)
                                                                          : "",
                                                              }
                                                          )
                                                      ),
                                              }),
                                              ...(suggestions.length === 0
                                                  ? [
                                                        h.p(
                                                            [
                                                                h.Attribute(
                                                                    "role",
                                                                    "status"
                                                                ),
                                                                h.Class(
                                                                    "text-sm text-muted-foreground"
                                                                ),
                                                            ],
                                                            [
                                                                (props
                                                                    .linkSuggestions
                                                                    ?.length ??
                                                                    0) === 0
                                                                    ? "No saved bookmarks are available in this editor."
                                                                    : "No bookmarks match your search.",
                                                            ]
                                                        ),
                                                    ]
                                                  : []),
                                          ]
                                      ),
                                      h.div(
                                          [
                                              h.Class(
                                                  "sticky bottom-0 z-10 flex flex-wrap justify-end gap-2 border-t border-border bg-card pt-4"
                                              ),
                                          ],
                                          [
                                              h.button(
                                                  [
                                                      ...render.closeButton,
                                                      h.Class(
                                                          "inline-flex min-h-10 max-w-full items-center rounded-[var(--radius-control)] border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
                                                      ),
                                                  ],
                                                  ["Cancel"]
                                              ),
                                              h.button(
                                                  [
                                                      h.Type("submit"),
                                                      ...(isAllowedLinkHref(
                                                          href
                                                      )
                                                          ? []
                                                          : [h.Disabled(true)]),
                                                      h.Class(
                                                          "inline-flex min-h-10 max-w-full items-center rounded-[var(--radius-control)] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                                                      ),
                                                  ],
                                                  ["Save"]
                                              ),
                                          ]
                                      ),
                                  ]
                              ),
                          ]
                        : []
                ),
        },
        toParentMessage: to_dialog_message,
    })
}

export type InlineRichTextProps<Message> = Readonly<{
    id: string
    model: RichTextEditorModel
    toParentMessage: (message: RichTextEditorMessage) => Message
    isEditing: boolean
    label?: string
    placeholder?: string
    className?: string
    attributes?: ReadonlyArray<Attribute<Message>>
}>

// NOTE: Read and edit render the same element with the same children, so gaining
// contenteditable never moves a glyph. RichTextEditor is the standalone editor
// page; this is the in-place counterpart for content that lives inside a layout.
export const InlineRichText = <Message>(
    props: InlineRichTextProps<Message>,
    h: HtmlBuilder<Message>
): Html => {
    const {
        AriaLabel,
        Attribute,
        Class,
        Contenteditable,
        Id,
        OnMount,
        Role,
        Spellcheck,
        Tabindex,
        keyed,
    } = h

    const placeholder = props.placeholder ?? ""
    let blockStart = 0
    const blocks = props.model.document.children.map((block, blockIndex) => {
        const content =
            blockText(block).length > 0
                ? renderBlockInlineContent<Message>(
                      { block, blockStart, selection: props.model.selection },
                      h
                  )
                : [
                      renderEmptyBlockFallback<Message>(
                          { blockIndex, blockStart, placeholder },
                          h
                      ),
                  ]
        blockStart += blockText(block).length + 1
        return richTextRenderBlock<Message>(block, content, h)
    })

    const surfaceAttributes = [
        ...(props.attributes ?? []),
        Id(props.id),
        Class(props.className ?? ""),
    ]

    // NOTE: The surface is keyed on the mode because OnMount only runs when a node
    // is created. Adding contenteditable to the existing node leaves the host
    // unmounted, so `maybeMountedHostId` stays empty, the input subscriptions never
    // attach, and edits land in the DOM without ever reaching the model. Remounting
    // costs nothing visually — tag, classes, and children are identical either way.
    const surface = keyed("div")

    if (!props.isEditing)
        return surface(`${props.id}:reading`, surfaceAttributes, blocks)

    return surface(
        `${props.id}:editing`,
        [
            ...surfaceAttributes,
            AriaLabel(props.label ?? "Editable content"),
            Attribute("aria-multiline", "true"),
            Contenteditable("true"),
            Role("textbox"),
            Spellcheck(true),
            Tabindex(0),
            OnMount(
                mountRichTextEditorHost({
                    id: props.id,
                    selection: props.model.selection,
                    toParentMessage: props.toParentMessage,
                })
            ),
        ],
        blocks
    )
}

export const RichTextEditor = <Message>(
    props: RichTextEditorProps<Message>,
    h: HtmlBuilder<Message>
): Html => {
    const {
        div,
        p,
        span,
        Class,
        AriaLabel,
        AriaPressed,
        Attribute,
        Contenteditable,
        DataAttribute,
        Id,
        OnMount,
        Role,
        Spellcheck,
        Tabindex,
    } = h
    const plainText = richTextEditorPlainText(props.model)
    const markdown = richTextEditorMarkdown(props.model)

    return div(
        [...(props.attributes ?? []), Class(editorSurfaceClassName)],
        [
            div(
                [Class("grid gap-1.5")],
                [
                    span(
                        [
                            Class(
                                "text-(length:--font-size-xs) font-medium uppercase tracking-[0.18em] text-muted-foreground"
                            ),
                        ],
                        [props.label ?? "Rich text editor"]
                    ),
                    p(
                        [
                            Class(
                                "m-0 max-w-2xl text-(length:--font-size-sm) leading-[var(--line-height-sm)] text-muted-foreground"
                            ),
                        ],
                        [
                            props.description ??
                                "Model-owned rich text editor with transaction-based paragraph, heading, and bold nodes.",
                        ]
                    ),
                ]
            ),
            div(
                [Class(toolbarClassName)],
                [
                    ...richTextBlockToolbarItems.map((item) =>
                        Button(
                            {
                                size: "icon",
                                isDisabled: props.isDisabled,
                                className: toolbarButtonClassName,
                                attributes: [
                                    Attribute("aria-label", item.label),
                                ],
                                onClick: props.toParentMessage(
                                    SelectedRichTextEditorBlockFormat(
                                        item.format
                                    )
                                ),
                                children: [
                                    item.format.type === "paragraph"
                                        ? IconPencil({ class: "size-4" })
                                        : item.format.type === "heading"
                                          ? item.format.level === 1
                                              ? IconHeading1({
                                                    class: "size-4",
                                                })
                                              : item.format.level === 2
                                                ? IconHeading2({
                                                      class: "size-4",
                                                  })
                                                : IconHeading3({
                                                      class: "size-4",
                                                  })
                                          : IconMessageSquare({
                                                class: "size-4",
                                            }),
                                ],
                            },
                            h
                        )
                    ),
                    ...richTextMarkToolbarItems.map((item) =>
                        Button(
                            {
                                size: "icon",
                                isDisabled: props.isDisabled,
                                className: `${toolbarButtonClassName} ${
                                    isMarkActive(props.model, item.value)
                                        ? toolbarButtonActiveClassName
                                        : ""
                                }`,
                                attributes: [
                                    AriaPressed(
                                        isMarkActive(props.model, item.value)
                                            ? "true"
                                            : "false"
                                    ),
                                    Attribute("aria-label", item.label),
                                ],
                                onClick: props.toParentMessage(
                                    markToolbarMessage(item.value, props.model)
                                ),
                                children: [
                                    item.value === "bold"
                                        ? IconBold({ class: "size-4" })
                                        : item.value === "italic"
                                          ? IconItalic({ class: "size-4" })
                                          : IconLink({ class: "size-4" }),
                                ],
                            },
                            h
                        )
                    ),
                    Button(
                        {
                            size: "icon",
                            isDisabled: props.isDisabled,
                            className: toolbarButtonClassName,
                            onClick: props.toParentMessage(
                                ClickedRichTextEditorImage()
                            ),
                            attributes: [Attribute("aria-label", "Image")],
                            children: [IconImage({ class: "size-4" })],
                        },
                        h
                    ),
                    Button(
                        {
                            size: "icon",
                            isDisabled: props.isDisabled,
                            className: toolbarButtonClassName,
                            attributes: [
                                Attribute("aria-label", "Copy Markdown"),
                                DataAttribute("rte-markdown", markdown),
                                OnMount(
                                    mountRichTextEditorCopyMarkdownButton(
                                        props.toParentMessage
                                    )
                                ),
                            ],
                            children: [IconCopy({ class: "size-4" })],
                        },
                        h
                    ),
                ]
            ),
            div(
                [
                    Class(editorSectionClassName),
                    ...DragAndDrop.droppable(
                        "rich-text-editor",
                        props.label ?? "Rich text editor"
                    ),
                ],
                [
                    div(
                        [
                            Id(props.id),
                            AriaLabel(props.label ?? "Rich text editor"),
                            Attribute("aria-multiline", "true"),
                            // NOTE: Rich text editing requires a model-owned contenteditable host so selections,
                            // Markdown paste/copy, inline marks, and block nodes stay synchronized with Foldkit state.
                            // The host carries textbox semantics here; the slash menu owns its menu semantics separately.
                            Contenteditable(
                                props.isDisabled ? "false" : "true"
                            ),
                            Role("textbox"),
                            Spellcheck(true),
                            Tabindex(props.isDisabled ? -1 : 0),
                            OnMount(
                                mountRichTextEditorHost({
                                    id: props.id,
                                    selection: props.model.selection,
                                    toParentMessage: props.toParentMessage,
                                })
                            ),
                            Class(contentEditorClassName),
                        ],
                        [
                            ...renderDocument<Message>(
                                {
                                    blocks: props.model.document.children,
                                    selection: props.model.selection,
                                    placeholder:
                                        props.placeholder ??
                                        "Press / for commands",
                                    hint:
                                        !props.model.slashMenu.isOpen &&
                                        plainText.length > 0
                                            ? span(
                                                  [
                                                      Class(
                                                          "pointer-events-none text-(length:--font-size-xs) leading-[var(--line-height-xs)] text-muted-foreground/55"
                                                      ),
                                                      Contenteditable("false"),
                                                  ],
                                                  ["Press / for commands"]
                                              )
                                            : undefined,
                                    toParentMessage: props.toParentMessage,
                                    model: props.model,
                                },
                                h
                            ),
                        ]
                    ),
                    ...(props.model.slashMenu.isOpen
                        ? [
                              RichTextEditorSlashMenu<Message>(
                                  {
                                      model: props.model,
                                      toParentMessage: props.toParentMessage,
                                      isBackdropDisabled:
                                          props.isSlashMenuBackdropDisabled,
                                  },
                                  h
                              ),
                          ]
                        : []),
                    ghostView<Message>(props.model, h),
                ]
            ),
            ...(props.isDebugSelectionVisible
                ? [
                      span(
                          [
                              Class(
                                  "text-(length:--font-size-xs) leading-[var(--line-height-xs)] text-muted-foreground"
                              ),
                          ],
                          [
                              `Selection: ${selectionStart(props.model.selection)}-${selectionEnd(props.model.selection)}`,
                          ]
                      ),
                  ]
                : []),
            linkDialogView(props, h),
        ]
    )
}

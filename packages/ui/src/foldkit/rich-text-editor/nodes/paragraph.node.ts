import { RichTextParagraphNode } from "@urm/domain/schemas/rich-text"
import type { Html, HtmlBuilder } from "foldkit/html"
import type {
    RichTextBlockNode,
    RichTextSelection,
    RichTextTextNode,
} from "../rich-text-editor.schema.ts"
import { IconExternalLink } from "../../icons/view.ts"
import { TextNode } from "./text.node.ts"

export type RenderRichTextNodeOptions = Readonly<{
    node: RichTextTextNode
    index: number
    start: number
    selection: RichTextSelection
    markClassNameForMarks: (marks: RichTextTextNode["marks"]) => string
}>

const richTextSelectionStart = (selection: RichTextSelection): number =>
    Math.min(selection.anchor, selection.focus)
const richTextSelectionEnd = (selection: RichTextSelection): number =>
    Math.max(selection.anchor, selection.focus)

const isExternalHttpLink = (href: string): boolean => {
    try {
        const url = new URL(href)
        return url.protocol === "http:" || url.protocol === "https:"
    } catch {
        return false
    }
}

const isAllowedLinkHref = (href: string): boolean => {
    const normalized = href.trim()
    if (
        normalized.startsWith("/") ||
        normalized.startsWith("./") ||
        normalized.startsWith("../") ||
        normalized.startsWith("#")
    ) {
        return true
    }
    try {
        const url = new URL(normalized)
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

export type RenderRichTextPlaceholderOptions = Readonly<{
    placeholder: string
    start: number
    className?: string
}>

export const RichTextParagraphNodeSchema = RichTextParagraphNode

export const ParagraphNode = {
    kind: "paragraph",
    slashCommand: { label: "Paragraph", value: "paragraph" },
    toolbarItem: { label: "Paragraph", format: { type: "paragraph" as const } },
    create: (
        children: ReadonlyArray<RichTextTextNode> = [TextNode.empty()]
    ): RichTextBlockNode => ({
        type: "paragraph",
        children,
    }),
    formatForSlashCommand: (
        value: string
    ): Readonly<{ type: "paragraph" }> | undefined =>
        value === ParagraphNode.slashCommand.value
            ? { type: "paragraph" }
            : undefined,
    markdown: {
        matchLine: (line: string): Readonly<{ content: string }> => ({
            content: line,
        }),
        serialize: (_block: RichTextBlockNode, content: string): string =>
            content,
    },
    // NOTE: Size, leading, and colour are inherited rather than declared here so
    // a paragraph takes the typography of whatever surface it is rendered into.
    // The standalone editor sets all three on its host (`contentEditorClassName`),
    // so it is unchanged; an inline surface gets the surrounding page's type
    // instead of the editor's, which is the point of editing in place. Headings
    // and blockquotes still set their own scale, because theirs is meaningful.
    className: () => "m-0 whitespace-pre-wrap",
    renderTextNode: <Message>(
        {
            node,
            index,
            start,
            selection,
            markClassNameForMarks,
        }: RenderRichTextNodeOptions,
        h: HtmlBuilder<Message>
    ): ReadonlyArray<Html | string> => {
        const { span, a, Class, DataAttribute, Attribute } = h
        const text = node.text || (index === 0 ? " " : "")
        const end = start + text.length
        const selectedStart = Math.max(start, richTextSelectionStart(selection))
        const selectedEnd = Math.min(end, richTextSelectionEnd(selection))
        const ranges =
            selectedStart < selectedEnd
                ? [
                      {
                          text: text.slice(0, selectedStart - start),
                          selected: false,
                          start,
                      },
                      {
                          text: text.slice(
                              selectedStart - start,
                              selectedEnd - start
                          ),
                          selected: true,
                          start: selectedStart,
                      },
                      {
                          text: text.slice(selectedEnd - start),
                          selected: false,
                          start: selectedEnd,
                      },
                  ].filter((range) => range.text.length > 0)
                : [{ text, selected: false, start }]
        const markClassName = markClassNameForMarks(node.marks)
        const linkMark = node.marks?.find(
            (mark): mark is { type: "link"; href: string } =>
                mark.type === "link"
        )
        const externalLink =
            linkMark !== undefined && isExternalHttpLink(linkMark.href)
        const wrap = (
            range: Readonly<{ text: string; selected: boolean; start: number }>,
            child: Html | string,
            showExternalIcon: boolean
        ) => {
            const attrs = [
                Class(
                    `${markClassName || (range.selected ? "" : "contents")} ${range.selected ? "rounded-sm bg-primary/20 text-foreground" : ""}`
                ),
                DataAttribute("rte-start", String(range.start)),
                DataAttribute(
                    "rte-end",
                    String(range.start + range.text.length)
                ),
            ]
            if (linkMark && isAllowedLinkHref(linkMark.href)) {
                return a(
                    [
                        ...attrs,
                        Attribute("href", linkMark.href),
                        ...(externalLink
                            ? [
                                  Attribute("target", "_blank"),
                                  Attribute("rel", "noopener"),
                              ]
                            : []),
                    ],
                    [
                        child,
                        ...(showExternalIcon
                            ? [
                                  span(
                                      [
                                          Attribute("aria-hidden", "true"),
                                          Attribute("contenteditable", "false"),
                                          Class("ml-0.5 inline-flex"),
                                      ],
                                      [
                                          IconExternalLink({
                                              class: "size-[0.8em]",
                                          }),
                                      ]
                                  ),
                              ]
                            : []),
                    ]
                )
            }
            return span(attrs, [child])
        }

        return ranges.map((range, range_index) =>
            wrap(
                range,
                range.text,
                externalLink && range_index === ranges.length - 1
            )
        )
    },
    renderPlaceholder: <Message>(
        {
            placeholder,
            start,
            className = "",
        }: RenderRichTextPlaceholderOptions,
        h: HtmlBuilder<Message>
    ): Html => {
        const { span, Class, DataAttribute, Attribute } = h
        return span(
            [Class(`relative inline-block ${className}`)],
            [
                span(
                    [
                        DataAttribute("rte-start", String(start)),
                        DataAttribute("rte-end", String(start + 1)),
                        DataAttribute("rte-placeholder", "true"),
                    ],
                    ["\u00A0"]
                ),
                ...(placeholder.length > 0
                    ? [
                          span(
                              [
                                  Attribute("aria-hidden", "true"),
                                  Attribute("contenteditable", "false"),
                                  Class(
                                      "pointer-events-none absolute left-0 top-0 w-max select-none whitespace-nowrap"
                                  ),
                              ],
                              [placeholder]
                          ),
                      ]
                    : []),
            ]
        )
    },
    render: <Message>(
        children: ReadonlyArray<Html | string>,
        h: HtmlBuilder<Message>
    ): Html => {
        const { p, Class } = h
        return p([Class(ParagraphNode.className())], children)
    },
} as const

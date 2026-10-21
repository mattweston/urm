import {
    blockSegments,
    blockText,
    isSelectionCollapsed,
    normalizeSelection,
    selectionEnd,
    selectionStart,
    textNodesInRange,
} from "./rich-text-editor.document.ts"
import {
    BlockquoteNode,
    HeadingNode,
    ImageNode,
    ParagraphNode,
    richTextMarkNodeForType,
    richTextMarkNodes,
} from "./rich-text-editor.registry.ts"
import { TextNode } from "./nodes/text.node.ts"
import type {
    RichTextBlockNode,
    RichTextDocument,
    RichTextEditorModel,
    RichTextMark,
    RichTextTextNode,
} from "./rich-text-editor.schema.ts"
import { richTextEditorPlainText } from "./rich-text-editor.model.ts"

const sameMarks = (
    left: ReadonlyArray<RichTextMark>,
    right: ReadonlyArray<RichTextMark>
): boolean => TextNode.sameMarks(left, right)

const pushTextNode = (
    nodes: Array<RichTextTextNode>,
    text: string,
    marks: ReadonlyArray<RichTextMark> = []
): void => {
    if (!text) return
    const previous = nodes.at(-1)
    if (previous && sameMarks(previous.marks ?? [], marks)) {
        nodes[nodes.length - 1] = TextNode.of(
            previous.text + text,
            previous.marks
        )
        return
    }
    nodes.push(TextNode.of(text, marks))
}

const parseInlineMarkdown = (
    value: string
): ReadonlyArray<RichTextTextNode> => {
    const nodes: Array<RichTextTextNode> = []
    let text = ""
    let index = 0
    const activeMarks = new Set<RichTextMark["type"]>()
    const markdownMarks = Array.from(richTextMarkNodes).sort(
        (left, right) =>
            right.markdown.marker.length - left.markdown.marker.length
    )

    const marks = (): ReadonlyArray<RichTextMark> =>
        [...richTextMarkNodes]
            .filter((node) => activeMarks.has(node.kind))
            .map((node) =>
                node.kind === "link"
                    ? { type: node.kind, href: "" }
                    : { type: node.kind }
            )
    const flush = () => {
        pushTextNode(nodes, text, marks())
        text = ""
    }

    while (index < value.length) {
        if (value.startsWith("\\", index) && index + 1 < value.length) {
            text += value[index + 1]
            index += 2
            continue
        }
        const matchedMark = markdownMarks.find((node) =>
            value.startsWith(node.markdown.marker, index)
        )
        if (matchedMark) {
            flush()
            if (activeMarks.has(matchedMark.kind))
                activeMarks.delete(matchedMark.kind)
            else activeMarks.add(matchedMark.kind)
            index += matchedMark.markdown.marker.length
            continue
        }
        text += value[index]
        index += 1
    }

    flush()
    return nodes.length > 0 ? nodes : [TextNode.empty()]
}

const markdownLineToBlock = (line: string): RichTextBlockNode => {
    const imageMatch = ImageNode.markdown.matchLine(line)
    if (imageMatch) {
        return { type: "image", src: imageMatch.src, alt: imageMatch.alt }
    }
    const match = HeadingNode.markdown.matchLine(line)
    if (match) {
        return HeadingNode.create(
            match.level,
            parseInlineMarkdown(match.content)
        )
    }
    const quoteMatch = BlockquoteNode.markdown.matchLine(line)
    if (quoteMatch)
        return BlockquoteNode.create(parseInlineMarkdown(quoteMatch.content))
    return ParagraphNode.create(
        parseInlineMarkdown(ParagraphNode.markdown.matchLine(line).content)
    )
}

export const richTextDocumentFromMarkdown = (
    markdown: string
): RichTextDocument => {
    const lines = markdown.replace(/\r\n?/g, "\n").split("\n")
    return { type: "doc", children: lines.map(markdownLineToBlock) }
}

const escapeMarkdownText = (value: string): string =>
    value.replace(/([\\*#>])/g, "\\$1")

const textNodeMarkdown = (node: RichTextTextNode): string => {
    const text = escapeMarkdownText(node.text)
    return [...(node.marks ?? [])]
        .map((mark) => richTextMarkNodeForType(mark.type))
        .filter(
            (markNode): markNode is NonNullable<typeof markNode> =>
                markNode !== undefined
        )
        .sort((left, right) => right.markdown.priority - left.markdown.priority)
        .reduce(
            (content, markNode) =>
                `${markNode.markdown.marker}${content}${markNode.markdown.marker}`,
            text
        )
}

const blockMarkdown = (block: RichTextBlockNode): string => {
    if (block.type === "image") return ImageNode.markdown.serialize(block)
    const content = block.children.map(textNodeMarkdown).join("")
    if (block.type === "heading")
        return HeadingNode.markdown.serialize(block, content)
    if (block.type === "blockquote")
        return BlockquoteNode.markdown.serialize(block, content)
    return ParagraphNode.markdown.serialize(block, content)
}

export const richTextDocumentMarkdown = (document: RichTextDocument): string =>
    document.children.map(blockMarkdown).join("\n")

export const richTextEditorMarkdown = (model: RichTextEditorModel): string =>
    richTextDocumentMarkdown(model.document)

export const richTextEditorSelectedMarkdown = (
    model: RichTextEditorModel
): string => {
    const textLength = richTextEditorPlainText(model).length
    const selection = normalizeSelection(model.selection, textLength)
    if (isSelectionCollapsed(selection)) return ""
    const start = selectionStart(selection)
    const end = selectionEnd(selection)

    const blocks = blockSegments(model).flatMap(
        (segment): ReadonlyArray<RichTextBlockNode> => {
            if (end <= segment.start || start >= segment.end) {
                if (
                    segment.block.type === "image" &&
                    start <= segment.start &&
                    end > segment.start
                ) {
                    return [segment.block]
                }
                return []
            }
            if (segment.block.type === "image") return [segment.block]
            const children = textNodesInRange(
                segment.block,
                segment.start,
                start,
                end
            )
            if (children.length === 0 && blockText(segment.block).length > 0)
                return []
            return [
                {
                    ...segment.block,
                    children:
                        children.length > 0 ? children : [TextNode.empty()],
                },
            ]
        }
    )

    return richTextDocumentMarkdown({ type: "doc", children: blocks })
}

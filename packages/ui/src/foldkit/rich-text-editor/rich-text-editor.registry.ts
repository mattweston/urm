import { BoldNode } from "./nodes/bold.node.ts"
import { BlockquoteNode } from "./nodes/blockquote.node.ts"
import { HeadingNode } from "./nodes/heading.node.ts"
import { ImageNode } from "./nodes/image.node.ts"
import { ItalicNode } from "./nodes/italic.node.ts"
import { LinkNode } from "./nodes/link.node.ts"
import { ParagraphNode } from "./nodes/paragraph.node.ts"
import type { KeyboardModifiers, HtmlBuilder } from "foldkit/html"
import type { Html } from "foldkit/html"
import type {
    RichTextBlockNode,
    RichTextHeadingLevel,
    RichTextMark,
    RichTextTextNode,
} from "./rich-text-editor.schema.ts"
import type { RichTextMarkType } from "./nodes/mark.schema.ts"

export type RichTextBlockFormat = Readonly<{
    type: "paragraph" | "heading" | "blockquote"
    level?: RichTextHeadingLevel | undefined
}>

export const richTextBlockNodes = [
    ParagraphNode,
    HeadingNode,
    BlockquoteNode,
    ImageNode,
] as const
export const richTextMarkNodes = [BoldNode, ItalicNode, LinkNode] as const

export const richTextBlockToolbarItems = [
    ParagraphNode.toolbarItem,
    ...HeadingNode.toolbarItems,
    BlockquoteNode.toolbarItem,
] as const

export const richTextMarkToolbarItems = richTextMarkNodes.map(
    (node) => node.toolbarItem
)

export const richTextSlashCommandDefinitions = [
    ParagraphNode.slashCommand,
    ...HeadingNode.slashCommands,
    BlockquoteNode.slashCommand,
    ImageNode.slashCommand,
    ...richTextMarkNodes.map((node) => node.slashCommand),
] as const

export type RichTextSlashCommandValue =
    (typeof richTextSlashCommandDefinitions)[number]["value"]

export const richTextMarkNodeForType = (type: RichTextMarkType) =>
    richTextMarkNodes.find((node) => node.kind === type)

export const richTextMarkClassNameForMarks = (
    marks: ReadonlyArray<RichTextMark> | undefined
): string =>
    (marks ?? [])
        .map((mark) => richTextMarkNodeForType(mark.type)?.className ?? "")
        .join(" ")

export const richTextMarkTypeForKeyboardShortcut = (
    key: string,
    modifiers: KeyboardModifiers
): RichTextMarkType | undefined =>
    richTextMarkNodes.find((node) => {
        const shortcut = node.keyboardShortcut
        if (!shortcut) return false
        if (shortcut.metaOrCtrl && !modifiers.metaKey && !modifiers.ctrlKey)
            return false
        return key.toLowerCase() === shortcut.key.toLowerCase()
    })?.kind

export const richTextBlockFormatForSlashCommand = (
    value: string
): RichTextBlockFormat | undefined =>
    ParagraphNode.formatForSlashCommand(value) ??
    HeadingNode.formatForSlashCommand(value) ??
    BlockquoteNode.formatForSlashCommand(value)

export const richTextCreateBlock = (
    format: RichTextBlockFormat,
    children: ReadonlyArray<RichTextTextNode>
): RichTextBlockNode => {
    if (format.type === "heading")
        return HeadingNode.create(format.level ?? 1, children)
    if (format.type === "blockquote") return BlockquoteNode.create(children)
    return ParagraphNode.create(children)
}

export const richTextMarkTypeForSlashCommand = (
    value: string
): RichTextMarkType | undefined =>
    richTextMarkNodes.find((node) => node.slashCommand.value === value)?.kind

export const richTextRenderBlock = <Message>(
    block: RichTextBlockNode,
    children: ReadonlyArray<Html | string>,
    h: HtmlBuilder<Message>
) => {
    if (block.type === "paragraph")
        return ParagraphNode.render<Message>(children, h)
    if (block.type === "blockquote")
        return BlockquoteNode.render<Message>(children, h)
    if (block.type === "heading")
        return HeadingNode.render<Message>(block.level, children, h)
    const { div } = h
    return div([], [])
}

export {
    BoldNode,
    BlockquoteNode,
    HeadingNode,
    ImageNode,
    ItalicNode,
    ParagraphNode,
}

import { RichTextBlockquoteNode } from "@urm/domain/schemas/rich-text"
import type { Html, HtmlBuilder } from "foldkit/html"
import type {
    RichTextBlockNode,
    RichTextTextNode,
} from "../rich-text-editor.schema.ts"

export const RichTextBlockquoteNodeSchema = RichTextBlockquoteNode

export const BlockquoteNode = {
    kind: "blockquote",
    slashCommand: { label: "Blockquote", value: "blockquote" },
    toolbarItem: { label: "Quote", format: { type: "blockquote" as const } },
    create: (children: ReadonlyArray<RichTextTextNode>): RichTextBlockNode => ({
        type: "blockquote",
        children,
    }),
    formatForSlashCommand: (
        value: string
    ): Readonly<{ type: "blockquote" }> | undefined =>
        value === BlockquoteNode.slashCommand.value
            ? { type: "blockquote" }
            : undefined,
    markdown: {
        matchLine: (
            line: string
        ): Readonly<{ content: string }> | undefined => {
            const match = /^>\s?(.*)$/.exec(line)
            return match ? { content: match[1] ?? "" } : undefined
        },
        serialize: (_block: RichTextBlockNode, content: string): string =>
            `> ${content}`,
    },
    className: () =>
        "m-0 border-l-4 border-border/70 pl-4 text-[15px] italic leading-7 text-muted-foreground whitespace-pre-wrap",
    render: <Message>(
        children: ReadonlyArray<Html | string>,
        h: HtmlBuilder<Message>
    ): Html => {
        const { blockquote, Class } = h
        return blockquote([Class(BlockquoteNode.className())], children)
    },
} as const

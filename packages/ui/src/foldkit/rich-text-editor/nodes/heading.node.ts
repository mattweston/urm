import {
    RichTextHeadingLevel as RichTextHeadingLevelDomain,
    RichTextHeadingNode as RichTextHeadingNodeDomain,
} from "@urm/domain/schemas/rich-text"
import type { Html, HtmlBuilder } from "foldkit/html"
import type {
    RichTextBlockNode,
    RichTextHeadingLevel,
    RichTextTextNode,
} from "../rich-text-editor.schema.ts"

export const RichTextHeadingLevelSchema = RichTextHeadingLevelDomain
export const RichTextHeadingNodeSchema = RichTextHeadingNodeDomain

export const HeadingNode = {
    kind: "heading",
    slashCommands: [
        { label: "Heading 1", value: "heading-1", level: 1 },
        { label: "Heading 2", value: "heading-2", level: 2 },
        { label: "Heading 3", value: "heading-3", level: 3 },
    ] as const,
    toolbarItems: [
        {
            label: "H1",
            format: { type: "heading" as const, level: 1 as const },
        },
        {
            label: "H2",
            format: { type: "heading" as const, level: 2 as const },
        },
        {
            label: "H3",
            format: { type: "heading" as const, level: 3 as const },
        },
    ] as const,
    create: (
        level: RichTextHeadingLevel,
        children: ReadonlyArray<RichTextTextNode>
    ): RichTextBlockNode => ({
        type: "heading",
        level,
        children,
    }),
    formatForSlashCommand: (
        value: string
    ):
        | Readonly<{ type: "heading"; level: RichTextHeadingLevel }>
        | undefined => {
        const command = HeadingNode.slashCommands.find(
            (item) => item.value === value
        )
        return command ? { type: "heading", level: command.level } : undefined
    },
    markdown: {
        matchLine: (
            line: string
        ):
            | Readonly<{ level: RichTextHeadingLevel; content: string }>
            | undefined => {
            const match = /^(#{1,3})\s+(.*)$/.exec(line)
            const marker = match?.[1]
            return marker
                ? {
                      level: marker.length as RichTextHeadingLevel,
                      content: match[2] ?? "",
                  }
                : undefined
        },
        serialize: (block: RichTextBlockNode, content: string): string =>
            block.type === "heading"
                ? `${"#".repeat(block.level)} ${content}`
                : content,
    },
    className: (level: RichTextHeadingLevel): string =>
        level === 1
            ? "m-0 min-h-[calc(var(--line-height-3xl)+var(--space-1))] text-[2rem] font-semibold leading-[1.1] tracking-[-0.03em] text-foreground"
            : level === 2
              ? "m-0 min-h-[calc(var(--line-height-2xl)+var(--space-1))] text-[1.5rem] font-semibold leading-[1.15] tracking-[-0.025em] text-foreground"
              : "m-0 min-h-[calc(var(--line-height-xl)+var(--space-1))] text-[1.25rem] font-semibold leading-[1.2] tracking-[-0.02em] text-foreground",
    render: <Message>(
        level: RichTextHeadingLevel,
        children: ReadonlyArray<Html | string>,
        h: HtmlBuilder<Message>
    ): Html => {
        const { h1, h2, h3, Class } = h
        if (level === 1)
            return h1([Class(HeadingNode.className(level))], children)
        if (level === 2)
            return h2([Class(HeadingNode.className(level))], children)
        return h3([Class(HeadingNode.className(level))], children)
    },
} as const

import type { RichTextMark, RichTextMarkType } from "./mark.schema.ts"
import type { RichTextTextNode } from "./text.schema.ts"
import { TextNode } from "./text.node.ts"

export type RichTextMarkDefinition = Readonly<{
    kind: RichTextMarkType
    keyboardShortcut?: Readonly<{
        key: string
        metaOrCtrl?: boolean
    }>
    slashCommand: Readonly<{
        label: string
        value: RichTextMarkType
    }>
    toolbarItem: Readonly<{
        label: string
        value: RichTextMarkType
    }>
    className: string
    markdown: Readonly<{
        marker: string
        priority: number
    }>
}>

export const MarkNode = {
    define: (definition: RichTextMarkDefinition): RichTextMarkDefinition =>
        definition,
    has: (
        marks: ReadonlyArray<RichTextMark> | undefined,
        type: RichTextMarkType
    ): boolean => marks?.some((mark) => mark.type === type) ?? false,
    toggle: (
        marks: ReadonlyArray<RichTextMark> | undefined,
        type: RichTextMarkType,
        extra?: Record<string, unknown>
    ): ReadonlyArray<RichTextMark> | undefined => {
        const current = marks ?? []
        return MarkNode.has(current, type)
            ? current.filter((mark) => mark.type !== type)
            : [...current, { type, ...extra } as RichTextMark]
    },
    insertStoredMark: (
        node: RichTextTextNode,
        offset: number,
        type: RichTextMarkType,
        extra?: Record<string, unknown>
    ): ReadonlyArray<RichTextTextNode> => {
        const splitOffset = Math.max(0, Math.min(offset, node.text.length))
        const before = node.text.slice(0, splitOffset)
        const after = node.text.slice(splitOffset)
        const nodes: Array<RichTextTextNode> = []

        if (before) nodes.push(TextNode.of(before, node.marks))
        nodes.push(TextNode.of("", MarkNode.toggle(node.marks, type, extra)))
        if (after) nodes.push(TextNode.of(after, node.marks))

        return nodes
    },
    toggleRange: (
        node: RichTextTextNode,
        start: number,
        end: number,
        type: RichTextMarkType,
        extra?: Record<string, unknown>
    ): ReadonlyArray<RichTextTextNode> => {
        const localStart = Math.max(0, Math.min(start, node.text.length))
        const localEnd = Math.max(localStart, Math.min(end, node.text.length))
        const before = node.text.slice(0, localStart)
        const selected = node.text.slice(localStart, localEnd)
        const after = node.text.slice(localEnd)
        const nodes: Array<RichTextTextNode> = []

        if (before) nodes.push(TextNode.of(before, node.marks))
        if (selected)
            nodes.push(
                TextNode.of(selected, MarkNode.toggle(node.marks, type, extra))
            )
        if (after) nodes.push(TextNode.of(after, node.marks))

        return nodes
    },
} as const

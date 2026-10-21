import type {
    RichTextMark,
    RichTextTextNode,
} from "../rich-text-editor.schema.ts"
export { RichTextTextNodeSchema } from "./text.schema.ts"

export const TextNode = {
    kind: "text",
    empty: (): RichTextTextNode => ({ type: "text", text: "" }),
    cleanMarks: (
        marks?: ReadonlyArray<RichTextMark>
    ): ReadonlyArray<RichTextMark> | undefined =>
        marks && marks.length > 0 ? marks : undefined,
    of: (
        text: string,
        marks?: ReadonlyArray<RichTextMark>
    ): RichTextTextNode => {
        const cleanMarks = TextNode.cleanMarks(marks)
        return cleanMarks
            ? { type: "text", text, marks: cleanMarks }
            : { type: "text", text }
    },
    clean: (node: RichTextTextNode): RichTextTextNode =>
        TextNode.of(node.text, node.marks),
    sameMarks: (
        left?: ReadonlyArray<RichTextMark>,
        right?: ReadonlyArray<RichTextMark>
    ): boolean => {
        const leftMarks = Array.from(left ?? []).sort((a, b) =>
            a.type.localeCompare(b.type)
        )
        const rightMarks = Array.from(right ?? []).sort((a, b) =>
            a.type.localeCompare(b.type)
        )
        return (
            leftMarks.length === rightMarks.length &&
            leftMarks.every(
                (mark, index) => mark.type === rightMarks[index]?.type
            )
        )
    },
    inserted: (
        text: string,
        marks?: ReadonlyArray<RichTextMark>
    ): ReadonlyArray<RichTextTextNode> =>
        text.length > 0 ? [TextNode.of(text, marks)] : [],
} as const

import { MarkNode } from "./mark.node.ts"

export const ItalicNode = MarkNode.define({
    kind: "italic" as const,
    keyboardShortcut: { key: "i", metaOrCtrl: true },
    slashCommand: { label: "Italic", value: "italic" },
    toolbarItem: { label: "Italic", value: "italic" },
    className: "italic",
    markdown: { marker: "*", priority: 1 },
})

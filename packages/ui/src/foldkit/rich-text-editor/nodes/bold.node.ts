import { MarkNode } from "./mark.node.ts"

export const BoldNode = MarkNode.define({
    kind: "bold" as const,
    keyboardShortcut: { key: "b", metaOrCtrl: true },
    slashCommand: { label: "Bold", value: "bold" },
    toolbarItem: { label: "Bold", value: "bold" },
    className: "font-semibold",
    markdown: { marker: "**", priority: 2 },
})

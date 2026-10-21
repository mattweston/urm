import { MarkNode } from "./mark.node.ts"

export const LinkNode = MarkNode.define({
    kind: "link" as const,
    slashCommand: { label: "Link", value: "link" },
    toolbarItem: { label: "Link", value: "link" },
    className: "underline text-primary",
    markdown: { marker: "[", priority: 1 },
})

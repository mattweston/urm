/*
For DB persistence: Search TODO: Create DB record via imagesApi.create in update.ts — follow the gallery's uploadSingleImage pattern.
*/
import { RichTextImageNode as RichTextImageNodeDomain } from "@urm/domain/schemas/rich-text"
import { toImageSrc } from "@urm/utils/media"
import type { Html, HtmlBuilder } from "foldkit/html"
export const RichTextImageNodeSchema = RichTextImageNodeDomain

export type RichTextImageNode = typeof RichTextImageNodeSchema.Type

export const ImageNode = {
    kind: "image",
    slashCommand: { label: "Image", value: "image" },
    markdown: {
        matchLine: (
            line: string
        ): Readonly<{ src: string; alt: string }> | undefined => {
            const match = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(line.trim())
            return match
                ? { alt: match[1] ?? "", src: match[2] ?? "" }
                : undefined
        },
        serialize: (block: RichTextImageNode): string =>
            `![${block.alt}](${block.src})`,
    },
    render: <Message>(
        block: RichTextImageNode,
        blockIndex: number,
        toEditAltMessage: (blockIndex: number) => Message,
        h: HtmlBuilder<Message>,
        resolved_src?: string
    ): Html => {
        const {
            figure,
            img,
            figcaption,
            button,
            Class,
            OnClick,
            Contenteditable,
            Src,
            Alt,
            Type,
        } = h
        return figure(
            [
                Class(
                    "group relative m-0 overflow-hidden rounded-[var(--radius-surface-sm)] border-(length:--surface-border-width) border-border/70 bg-muted/40"
                ),
                Contenteditable("false"),
            ],
            [
                img([
                    Class("h-auto w-full object-cover"),
                    Src(resolved_src ?? toImageSrc(block.src)),
                    Alt(block.alt),
                ]),
                figcaption(
                    [
                        Class(
                            "flex items-center justify-between gap-2 px-4 py-3 text-xs text-muted-foreground"
                        ),
                    ],
                    [
                        "Alt: " + block.alt,
                        button(
                            [
                                Class(
                                    "rounded-full border-(length:--control-outline-border-width) border-border/70 bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent [box-shadow:var(--shadow-control)]"
                                ),
                                Type("button"),
                                OnClick(toEditAltMessage(blockIndex)),
                            ],
                            ["Edit"]
                        ),
                    ]
                ),
            ]
        )
    },
} as const

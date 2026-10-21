import { Option, Schema } from "effect"

import {
    RichTextContent,
    RichTextDocument,
    type RichTextTextNode,
} from "@urm/domain/schemas/rich-text"

export const EmailNewsletterRichTextBlock = Schema.Struct({
    block_id: Schema.String,
    type: Schema.Literal("rich_text"),
    document: RichTextDocument,
})

export const EmailNewsletterHeroBlock = Schema.Struct({
    block_id: Schema.String,
    type: Schema.Literal("hero"),
    eyebrow: Schema.String,
    heading: Schema.String,
    body: Schema.String,
})

export const EmailNewsletterCallToActionBlock = Schema.Struct({
    block_id: Schema.String,
    type: Schema.Literal("call_to_action"),
    heading: Schema.String,
    body: Schema.String,
    label: Schema.String,
    url: Schema.String,
})

export const EmailNewsletterTestimonialBlock = Schema.Struct({
    block_id: Schema.String,
    type: Schema.Literal("testimonial"),
    quote: Schema.String,
    attribution: Schema.String,
})

export const EmailNewsletterExternalImage = Schema.Struct({
    image_id: Schema.String,
    source: Schema.Literal("external_https"),
    src: Schema.String,
    alt: Schema.String,
})
export type EmailNewsletterExternalImage =
    typeof EmailNewsletterExternalImage.Type

export const EmailNewsletterArticleCardBlock = Schema.Struct({
    block_id: Schema.String,
    type: Schema.Literal("article_card"),
    image: EmailNewsletterExternalImage,
    kicker: Schema.String,
    heading: Schema.String,
    summary: Schema.String,
    link_label: Schema.String,
    url: Schema.String,
})

export const EmailNewsletterGalleryBlock = Schema.Struct({
    block_id: Schema.String,
    type: Schema.Literal("gallery"),
    images: Schema.Array(EmailNewsletterExternalImage),
})

export const EmailNewsletterBlock = Schema.Union([
    EmailNewsletterRichTextBlock,
    EmailNewsletterHeroBlock,
    EmailNewsletterCallToActionBlock,
    EmailNewsletterTestimonialBlock,
    EmailNewsletterArticleCardBlock,
    EmailNewsletterGalleryBlock,
])
export type EmailNewsletterBlock = typeof EmailNewsletterBlock.Type

export const EmailNewsletterDocument = Schema.Struct({
    schema_version: Schema.Literal(2),
    blocks: Schema.Array(EmailNewsletterBlock),
})
export type EmailNewsletterDocument = typeof EmailNewsletterDocument.Type

const text_node = (text: string): RichTextTextNode => ({ type: "text", text })

export const emailNewsletterDocumentFromPlainText = (
    value: string
): RichTextDocument => ({
    type: "doc",
    children: value.split("\n").map((line) => ({
        type: "paragraph",
        children: [text_node(line)],
    })),
})

export const decodeEmailNewsletterContent = (value: string): RichTextDocument =>
    emailNewsletterPrimaryRichText(decodeEmailNewsletterBlockContent(value))

export const emailNewsletterDocumentFromRichText = (
    document: RichTextDocument
): EmailNewsletterDocument => ({
    schema_version: 2,
    blocks: [{ block_id: "body", type: "rich_text", document }],
})

export const decodeEmailNewsletterBlockContent = (
    value: string
): EmailNewsletterDocument => {
    try {
        const parsed: unknown = JSON.parse(value)
        const current = Schema.decodeUnknownOption(EmailNewsletterDocument)(
            parsed
        )
        if (Option.isSome(current)) return current.value

        const legacy_document = Option.match(
            Schema.decodeUnknownOption(RichTextContent)(parsed),
            {
                onNone: () => emailNewsletterDocumentFromPlainText(value),
                onSome: ({ document }) => document,
            }
        )
        return emailNewsletterDocumentFromRichText(legacy_document)
    } catch {
        return emailNewsletterDocumentFromRichText(
            emailNewsletterDocumentFromPlainText(value)
        )
    }
}

export const encodeEmailNewsletterContent = (
    document: RichTextDocument
): string =>
    encodeEmailNewsletterBlockContent(
        emailNewsletterDocumentFromRichText(document)
    )

export const encodeEmailNewsletterBlockContent = (
    document: EmailNewsletterDocument
): string => JSON.stringify(document)

export const emailNewsletterPrimaryRichText = (
    document: EmailNewsletterDocument
): RichTextDocument =>
    document.blocks.find((block) => block.type === "rich_text")?.document ??
    emailNewsletterDocumentFromPlainText("")

export const replaceEmailNewsletterPrimaryRichText = (
    document: EmailNewsletterDocument,
    rich_text_document: RichTextDocument
): EmailNewsletterDocument => {
    const rich_text_index = document.blocks.findIndex(
        (block) => block.type === "rich_text"
    )
    if (rich_text_index === -1) {
        return {
            ...document,
            blocks: [
                ...document.blocks,
                {
                    block_id: "body",
                    type: "rich_text",
                    document: rich_text_document,
                },
            ],
        }
    }

    return {
        ...document,
        blocks: document.blocks.map((block, index) =>
            index === rich_text_index && block.type === "rich_text"
                ? { ...block, document: rich_text_document }
                : block
        ),
    }
}

const block_plain_text = (
    block: RichTextDocument["children"][number]
): string =>
    block.type === "image"
        ? block.alt.trim() === ""
            ? ""
            : `[Image: ${block.alt}]`
        : block.children.map(({ text }) => text).join("")

export const emailNewsletterPlainText = (document: RichTextDocument): string =>
    document.children.map(block_plain_text).join("\n")

export const emailNewsletterBlocksPlainText = (
    document: EmailNewsletterDocument
): string =>
    document.blocks
        .map((block) => {
            switch (block.type) {
                case "rich_text":
                    return emailNewsletterPlainText(block.document)
                case "hero":
                    return [block.eyebrow, block.heading, block.body]
                        .filter((value) => value.trim() !== "")
                        .join("\n")
                case "call_to_action":
                    return [
                        block.heading,
                        block.body,
                        block.label.trim() === ""
                            ? block.url
                            : block.url.trim() === ""
                              ? block.label
                              : `${block.label}: ${block.url}`,
                    ]
                        .filter((value) => value.trim() !== "")
                        .join("\n")
                case "testimonial":
                    return [block.quote, block.attribution]
                        .filter((value) => value.trim() !== "")
                        .join("\n")
                case "article_card":
                    return [
                        block.image.alt.trim() === ""
                            ? ""
                            : `[Image: ${block.image.alt}]`,
                        block.kicker,
                        block.heading,
                        block.summary,
                        block.link_label.trim() === ""
                            ? block.url
                            : block.url.trim() === ""
                              ? block.link_label
                              : `${block.link_label}: ${block.url}`,
                    ]
                        .filter((value) => value.trim() !== "")
                        .join("\n")
                case "gallery":
                    return block.images
                        .map((image) =>
                            image.alt.trim() === ""
                                ? ""
                                : `[Image: ${image.alt}]`
                        )
                        .filter((value) => value !== "")
                        .join("\n")
            }
        })
        .filter((value) => value.trim() !== "")
        .join("\n\n")

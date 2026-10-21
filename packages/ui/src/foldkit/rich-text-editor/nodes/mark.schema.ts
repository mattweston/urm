import {
    RichTextBoldMark as RichTextBoldMarkDomain,
    RichTextItalicMark as RichTextItalicMarkDomain,
    RichTextLinkMark as RichTextLinkMarkDomain,
    RichTextMark as RichTextMarkDomain,
} from "@urm/domain/schemas/rich-text"

export const RichTextBoldMarkSchema = RichTextBoldMarkDomain
export const RichTextItalicMarkSchema = RichTextItalicMarkDomain
export const RichTextLinkMarkSchema = RichTextLinkMarkDomain
export const RichTextMarkSchema = RichTextMarkDomain

export type RichTextMark = typeof RichTextMarkSchema.Type
export type RichTextMarkType = RichTextMark["type"]

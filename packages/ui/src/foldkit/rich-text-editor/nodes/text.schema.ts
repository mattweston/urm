import { RichTextTextNode as RichTextTextNodeDomain } from "@urm/domain/schemas/rich-text"

export const RichTextTextNodeSchema = RichTextTextNodeDomain

export type RichTextTextNode = typeof RichTextTextNodeSchema.Type

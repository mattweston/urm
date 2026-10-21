import { Schema } from "effect"

import { Tag, EntityTag } from "./schemas/tags.ts"

export const TagFields = Schema.Struct({
    name: Schema.Trimmed.check(Schema.isMinLength(1), Schema.isMaxLength(255)),
    color: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(50)),
    description: Schema.NullOr(Schema.String.check(Schema.isMaxLength(20000))),
})
export const TagCatalogRecord = Schema.Struct({
    id: Schema.String,
    tags: Schema.Array(Tag),
    entity_tags: Schema.Array(EntityTag),
})
export const TagAction = Schema.Union([
    Schema.Struct({
        _tag: Schema.Literal("create"),
        id: Schema.String,
        ...TagFields.fields,
    }),
    Schema.Struct({
        _tag: Schema.Literal("update"),
        id: Schema.String,
        ...TagFields.fields,
    }),
    Schema.Struct({ _tag: Schema.Literal("delete"), id: Schema.String }),
    Schema.Struct({ _tag: Schema.Literal("sync_directory") }),
])
export type TagAction = typeof TagAction.Type

export type TagFields = typeof TagFields.Type

export type TagCatalogRecord = typeof TagCatalogRecord.Type

export class TagsWriteError extends Schema.TaggedErrorClass<TagsWriteError>()(
    "TagsWriteError",
    { message: Schema.String }
) {}

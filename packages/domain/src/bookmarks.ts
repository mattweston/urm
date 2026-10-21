import { Schema } from "effect"

export const BookmarkFields = Schema.Struct({
    title: Schema.Trimmed.check(Schema.isMinLength(1), Schema.isMaxLength(255)),
    href: Schema.Trimmed.check(Schema.isMinLength(1), Schema.isMaxLength(2048)),
    tags: Schema.Array(
        Schema.Trimmed.check(Schema.isMinLength(1), Schema.isMaxLength(50))
    ).check(Schema.isMaxLength(20)),
})
export const Bookmark = Schema.Struct({
    id: Schema.String,
    title: Schema.String,
    href: Schema.String,
    tags: Schema.Array(Schema.String),
    updated_at: Schema.Number,
})
export const BookmarkCatalogRecord = Schema.Struct({
    id: Schema.String,
    bookmarks: Schema.Array(Bookmark),
})
export const BookmarkAction = Schema.Union([
    Schema.Struct({
        _tag: Schema.Literal("create"),
        id: Schema.String,
        ...BookmarkFields.fields,
    }),
    Schema.Struct({
        _tag: Schema.Literal("update"),
        id: Schema.String,
        ...BookmarkFields.fields,
    }),
    Schema.Struct({ _tag: Schema.Literal("delete"), id: Schema.String }),
])
export type BookmarkAction = typeof BookmarkAction.Type

export type BookmarkFields = typeof BookmarkFields.Type

export type Bookmark = typeof Bookmark.Type

export type BookmarkCatalogRecord = typeof BookmarkCatalogRecord.Type

export class BookmarksWriteError extends Schema.TaggedErrorClass<BookmarksWriteError>()(
    "BookmarksWriteError",
    { message: Schema.String }
) {}

import { BookmarkCatalogRecord, BookmarkAction } from "@urm/domain/bookmarks"
export {
    BookmarkFields,
    Bookmark,
    BookmarkCatalogRecord,
    BookmarkAction,
} from "@urm/domain/bookmarks"
import { Schema } from "effect"
import { Entity, Mutation, Query, Remote } from "foldkit-remote"

export const BookmarkCatalog = Entity.make(
    "BookmarkCatalog",
    BookmarkCatalogRecord
)
export const BookmarkCatalogSummary = BookmarkCatalog.select({
    id: true,
    bookmarks: true,
})

export const DomainBookmarks = Query.make("DomainBookmarks", {
    Input: { domain_id: Schema.String },
    Result: BookmarkCatalog,
})
export const ChangeBookmarks = Mutation.make("ChangeBookmarks", {
    Input: {
        account_id: Schema.optional(Schema.String),
        domain_id: Schema.String,
        action: BookmarkAction,
    },
    Output: { domain_id: Schema.String },
})
export const BookmarksRemote = Remote.define({
    entities: [BookmarkCatalog],
    queries: [DomainBookmarks],
    mutations: [ChangeBookmarks],
})

import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import { Bookmark } from "./bookmarks.model.ts"

export const LoadedBookmarks = taggedStruct("LoadedBookmarks", {
    bookmarks: S.Array(Bookmark),
})
export const UpdatedBookmarkQuery = taggedStruct("UpdatedBookmarkQuery", {
    value: S.String,
})
export const UpdatedBookmarkTitle = taggedStruct("UpdatedBookmarkTitle", {
    value: S.String,
})
export const UpdatedBookmarkHref = taggedStruct("UpdatedBookmarkHref", {
    value: S.String,
})
export const UpdatedBookmarkTags = taggedStruct("UpdatedBookmarkTags", {
    value: S.String,
})
export const ClickedEditBookmark = taggedStruct("ClickedEditBookmark", {
    bookmark: Bookmark,
})
export const ClickedCancelBookmark = taggedStruct("ClickedCancelBookmark")
export const SubmittedBookmark = taggedStruct("SubmittedBookmark")
export const ClickedDeleteBookmark = taggedStruct("ClickedDeleteBookmark", {
    bookmark_id: S.String,
})
export const SavedBookmark = taggedStruct("SavedBookmark", {
    bookmark: Bookmark,
})
export const DeletedBookmark = taggedStruct("DeletedBookmark", {
    bookmark_id: S.String,
})
export const BookmarkOperationFailed = taggedStruct("BookmarkOperationFailed", {
    error: S.String,
})

export const Message = S.Union([
    LoadedBookmarks,
    UpdatedBookmarkQuery,
    UpdatedBookmarkTitle,
    UpdatedBookmarkHref,
    UpdatedBookmarkTags,
    ClickedEditBookmark,
    ClickedCancelBookmark,
    SubmittedBookmark,
    ClickedDeleteBookmark,
    SavedBookmark,
    DeletedBookmark,
    BookmarkOperationFailed,
])
export type Message = typeof Message.Type

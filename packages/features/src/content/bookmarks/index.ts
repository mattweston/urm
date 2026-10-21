export {
    BookmarkOperationFailed,
    ClickedDeleteBookmark,
    ClickedEditBookmark,
    DeletedBookmark,
    LoadedBookmarks,
    Message,
    SavedBookmark,
    SubmittedBookmark,
    UpdatedBookmarkHref,
    UpdatedBookmarkTags,
    UpdatedBookmarkTitle,
} from "../../documents/bookmarks/bookmarks.message.ts"
export type { Message as MessageType } from "../../documents/bookmarks/bookmarks.message.ts"
export { Bookmark, Model } from "../../documents/bookmarks/bookmarks.model.ts"
export type {
    Bookmark as BookmarkType,
    Model as ModelType,
} from "../../documents/bookmarks/bookmarks.model.ts"
export {
    bookmarksHref,
    isBookmarksPath,
} from "../../documents/bookmarks/route.ts"
export { init, update } from "../../documents/bookmarks/bookmarks.update.ts"
export { view } from "../../documents/bookmarks/bookmarks.view.ts"
export { linkSuggestions } from "../../documents/bookmarks/index.ts"

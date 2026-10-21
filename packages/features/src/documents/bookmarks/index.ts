export {
    BookmarkOperationFailed,
    DeletedBookmark,
    LoadedBookmarks,
    Message,
    SavedBookmark,
} from "./bookmarks.message.ts"
export type { Message as MessageType } from "./bookmarks.message.ts"
export { Bookmark, Model } from "./bookmarks.model.ts"
export type {
    Bookmark as BookmarkType,
    Model as ModelType,
} from "./bookmarks.model.ts"
export { bookmarksHref, isBookmarksPath } from "./route.ts"
export { init, update } from "./bookmarks.update.ts"
export { view } from "./bookmarks.view.ts"

export const linkSuggestions = (
    bookmarks: ReadonlyArray<import("./bookmarks.model.ts").Bookmark>
) =>
    bookmarks.map((bookmark) => ({
        id: bookmark.id,
        title: bookmark.title,
        href: bookmark.href,
        tags: bookmark.tags,
    }))

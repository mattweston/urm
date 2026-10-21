const BOOKMARKS_PATH = "/content/bookmarks"
const LEGACY_BOOKMARKS_PATH = "/pages/bookmarks"

export const bookmarksHref = (): string => `${BOOKMARKS_PATH}/`

export const isBookmarksPath = (pathname: string): boolean =>
    pathname === BOOKMARKS_PATH ||
    pathname === `${BOOKMARKS_PATH}/` ||
    pathname === LEGACY_BOOKMARKS_PATH ||
    pathname === `${LEGACY_BOOKMARKS_PATH}/`

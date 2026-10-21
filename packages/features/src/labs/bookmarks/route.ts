const BOOKMARKS_PATH = "/dev/bookmarks"

export const bookmarksHref = () => `${BOOKMARKS_PATH}/`

export const isBookmarksPath = (pathname: string): boolean =>
    pathname === BOOKMARKS_PATH || pathname === `${BOOKMARKS_PATH}/`

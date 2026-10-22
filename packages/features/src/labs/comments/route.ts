const PATH = "/forms/comments"

export const commentsHref = (): string => `${PATH}/`

export const isCommentsPath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

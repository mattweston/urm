const PATH = "/layout/blockquote"

export const blockquoteHref = () => `${PATH}/`

export const isBlockquotePath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

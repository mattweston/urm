const PATH = "/labs/lists/virtual-list"

export const virtualListHref = () => `${PATH}/`

export const isVirtualListPath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

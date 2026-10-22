const PATH = "/data/query-table"

export const queryTableHref = () => `${PATH}/`

export const isQueryTablePath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

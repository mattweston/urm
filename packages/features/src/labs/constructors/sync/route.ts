const PATH = "/labs/learn/constructors/sync"

export const sync_href = () => `${PATH}/`

export const is_sync_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

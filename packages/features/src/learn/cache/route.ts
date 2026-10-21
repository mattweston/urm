const PATH = "/learn/cache"

export const cache_href = () => `${PATH}/`

export const is_cache_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

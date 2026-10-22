const API_CACHE_PATH = "/api-cache"

export const apiCacheHref = () => `${API_CACHE_PATH}/`

export const isApiCachePath = (pathname: string): boolean =>
    pathname === API_CACHE_PATH || pathname === `${API_CACHE_PATH}/`

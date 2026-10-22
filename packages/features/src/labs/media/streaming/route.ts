const BASE = "/media/streaming"

export const isStreamingPath = (pathname: string): boolean =>
    pathname === BASE || pathname === `${BASE}/`

export const streamingHref = (): string => `${BASE}/`

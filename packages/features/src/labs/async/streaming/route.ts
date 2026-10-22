const PATH = "/labs/learn/async/streaming"

export const streaming_href = () => `${PATH}/`

export const is_streaming_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

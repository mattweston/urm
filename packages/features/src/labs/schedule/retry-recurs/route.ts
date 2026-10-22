const PATH = "/labs/learn/schedule/retry-recurs"

export const retry_recurs_href = () => `${PATH}/`

export const is_retry_recurs_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

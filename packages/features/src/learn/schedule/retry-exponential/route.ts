const PATH = "/learn/schedule/retry-exponential"

export const retry_exponential_href = () => `${PATH}/`

export const is_retry_exponential_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

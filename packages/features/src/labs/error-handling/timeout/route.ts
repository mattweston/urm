const PATH = "/labs/learn/error-handling/timeout"

export const timeout_href = () => `${PATH}/`

export const is_timeout_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

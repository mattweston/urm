const PATH = "/learn/error-handling/or-else"

export const or_else_href = () => `${PATH}/`

export const is_or_else_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

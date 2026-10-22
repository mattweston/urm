const PATH = "/labs/learn/error-handling/eventually"

export const eventually_href = () => `${PATH}/`

export const is_eventually_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

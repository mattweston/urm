const PATH = "/labs/learn/concurrency/all"

export const all_href = () => `${PATH}/`

export const is_all_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

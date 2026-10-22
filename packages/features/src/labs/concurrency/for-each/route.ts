const PATH = "/labs/learn/concurrency/for-each"

export const for_each_href = () => `${PATH}/`

export const is_for_each_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

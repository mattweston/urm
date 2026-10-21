const PATH = "/learn/reduce"

export const reduce_href = () => `${PATH}/`

export const is_reduce_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

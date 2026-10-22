const PATH = "/learn/tuple"

export const tuple_href = () => `${PATH}/`

export const is_tuple_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

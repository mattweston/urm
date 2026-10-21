const PATH = "/learn/array"

export const array_href = () => `${PATH}/`

export const is_array_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

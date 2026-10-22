const PATH = "/learn/string"

export const string_href = () => `${PATH}/`

export const is_string_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

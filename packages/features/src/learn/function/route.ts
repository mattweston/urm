const PATH = "/learn/function"

export const function_href = () => `${PATH}/`

export const is_function_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

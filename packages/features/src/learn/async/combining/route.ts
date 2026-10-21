const PATH = "/learn/async/combining"

export const combining_href = () => `${PATH}/`

export const is_combining_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

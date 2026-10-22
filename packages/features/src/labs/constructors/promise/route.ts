const PATH = "/learn/constructors/promise"

export const promise_href = () => `${PATH}/`

export const is_promise_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

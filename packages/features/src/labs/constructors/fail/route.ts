const PATH = "/learn/constructors/fail"

export const fail_href = () => `${PATH}/`

export const is_fail_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

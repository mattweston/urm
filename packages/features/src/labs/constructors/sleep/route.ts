const PATH = "/labs/learn/constructors/sleep"

export const sleep_href = () => `${PATH}/`

export const is_sleep_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

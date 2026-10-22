const PATH = "/labs/learn/result"

export const result_href = () => `${PATH}/`

export const is_result_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

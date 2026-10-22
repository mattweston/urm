const PATH = "/labs/learn/number"

export const number_href = () => `${PATH}/`

export const is_number_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

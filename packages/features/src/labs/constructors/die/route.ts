const PATH = "/labs/learn/constructors/die"

export const die_href = () => `${PATH}/`

export const is_die_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

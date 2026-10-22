const PATH = "/learn/effect"

export const effect_href = () => `${PATH}/`

export const is_effect_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

const PATH = "/labs/learn/side-effects/on-change"

export const on_change_href = () => `${PATH}/`

export const is_on_change_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

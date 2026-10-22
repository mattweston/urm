const PATH = "/labs/learn/schedule/repeat-spaced"

export const repeat_spaced_href = () => `${PATH}/`

export const is_repeat_spaced_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

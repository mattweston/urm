const PATH = "/labs/learn/schedule/repeat-while"

export const repeat_while_href = () => `${PATH}/`

export const is_repeat_while_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

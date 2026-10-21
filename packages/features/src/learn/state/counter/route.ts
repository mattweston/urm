const PATH = "/learn/state/counter"

export const counter_href = () => `${PATH}/`

export const is_counter_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

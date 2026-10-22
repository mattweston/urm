const PATH = "/labs/learn/async/optimistic-update"

export const optimistic_update_href = () => `${PATH}/`

export const is_optimistic_update_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

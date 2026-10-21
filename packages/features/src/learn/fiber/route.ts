const PATH = "/learn/fiber"

export const fiber_href = () => `${PATH}/`

export const is_fiber_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

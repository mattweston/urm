const PATH = "/learn/scope/acquire-release"

export const acquire_release_href = () => `${PATH}/`

export const is_acquire_release_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

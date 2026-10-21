const PATH = "/learn/ref/ref-update-and-get"

export const ref_update_and_get_href = () => `${PATH}/`

export const is_ref_update_and_get_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

const PATH = "/labs/learn/ref/ref-make"

export const ref_make_href = () => `${PATH}/`

export const is_ref_make_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

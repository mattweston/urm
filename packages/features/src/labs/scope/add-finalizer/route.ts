const PATH = "/learn/scope/add-finalizer"

export const add_finalizer_href = () => `${PATH}/`

export const is_add_finalizer_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

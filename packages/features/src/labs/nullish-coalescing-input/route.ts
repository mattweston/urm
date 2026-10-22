const PATH = "/learn/nullish-coalescing-input"

export const nullish_coalescing_input_href = () => `${PATH}/`

export const is_nullish_coalescing_input_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

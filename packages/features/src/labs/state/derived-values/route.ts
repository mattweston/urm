const PATH = "/learn/state/derived-values"

export const derived_values_href = () => `${PATH}/`

export const is_derived_values_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

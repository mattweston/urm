const PATH = "/learn/error-handling/all-short-circuit"

export const all_short_circuit_href = () => `${PATH}/`

export const is_all_short_circuit_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

const PATH = "/labs/learn/state/combined-inputs"

export const combined_inputs_href = () => `${PATH}/`

export const is_combined_inputs_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

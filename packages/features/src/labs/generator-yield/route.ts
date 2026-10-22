const PATH = "/labs/learn/generator-yield"

export const generator_yield_href = () => `${PATH}/`

export const is_generator_yield_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

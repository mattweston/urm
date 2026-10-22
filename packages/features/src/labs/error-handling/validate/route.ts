const PATH = "/labs/learn/error-handling/validate"

export const validate_href = () => `${PATH}/`

export const is_validate_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

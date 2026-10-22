const PATH = "/learn/error-handling/first-success-of"

export const first_success_of_href = () => `${PATH}/`

export const is_first_success_of_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

const PATH = "/learn/record"

export const record_href = () => `${PATH}/`

export const is_record_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

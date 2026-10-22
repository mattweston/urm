const PATH = "/labs/learn/schema"

export const schema_href = () => `${PATH}/`

export const is_schema_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

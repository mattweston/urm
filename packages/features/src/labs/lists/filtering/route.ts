const PATH = "/learn/lists/filtering"

export const filtering_href = () => `${PATH}/`

export const is_filtering_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

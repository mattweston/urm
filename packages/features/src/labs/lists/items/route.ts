const PATH = "/labs/learn/lists/items"

export const items_href = () => `${PATH}/`

export const is_items_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

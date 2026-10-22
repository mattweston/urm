const PATH = "/learn/components/embedding"

export const embedding_href = () => `${PATH}/`

export const is_embedding_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

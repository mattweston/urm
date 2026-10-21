const PATH = "/labs/learn/fold"

export const foldHref = () => `${PATH}/`

export const isFoldPath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

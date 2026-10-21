const PATH = "/labs/layout/article"

export const articleHref = () => `${PATH}/`

export const isArticlePath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

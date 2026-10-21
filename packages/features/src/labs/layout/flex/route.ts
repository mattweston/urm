const PATH = "/labs/layout/flex"

export const flexHref = () => `${PATH}/`

export const isFlexPath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

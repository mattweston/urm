const PATH = "/labs/layout/flex-form"

export const flexFormHref = () => `${PATH}/`

export const isFlexFormPath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

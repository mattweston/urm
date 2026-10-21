const PATH = "/forms/contact"

export const contactHref = () => `${PATH}/`

export const isContactPath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

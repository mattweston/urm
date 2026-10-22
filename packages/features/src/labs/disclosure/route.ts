const PATH = "/ui/disclosure"

export const disclosureHref = () => `${PATH}/`

export const isDisclosurePath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

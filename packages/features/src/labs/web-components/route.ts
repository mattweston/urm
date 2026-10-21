const PATH = "/labs/web-components"

export const webComponentsHref = () => `${PATH}/`

export const isWebComponentsPath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

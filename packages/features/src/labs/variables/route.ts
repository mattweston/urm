const PATH = "/learn/variables"

export const variablesHref = () => `${PATH}/`

export const isVariablesPath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

const PATH = "/typography/variable-fonts"

export const variableFontsHref = () => `${PATH}/`

export const isVariableFontsPath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

const PATH = "/labs/typography/variable-fonts"

export const variableFontsHref = () => `${PATH}/`

export const isVariableFontsPath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

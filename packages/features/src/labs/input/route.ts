const PATH = "/labs/forms/input"

export const inputHref = () => `${PATH}/`

export const isInputPath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

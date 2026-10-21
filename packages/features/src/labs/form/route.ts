const PATH = "/labs/forms/form"

export const formHref = () => `${PATH}/`

export const isFormPath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

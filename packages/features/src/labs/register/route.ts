const PATH = "/labs/auth/register"

export const registerHref = (): string => `${PATH}/`

export const isRegisterPath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

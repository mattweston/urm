const PATH = "/labs/ui/menu"

export const menuHref = () => `${PATH}/`

export const isMenuPath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

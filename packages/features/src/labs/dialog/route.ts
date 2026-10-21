const PATH = "/labs/dialog/dialog"

export const dialogHref = () => `${PATH}/`

export const isDialogPath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

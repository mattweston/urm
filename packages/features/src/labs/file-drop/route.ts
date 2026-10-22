const PATH = "/media/file-drop"

export const fileDropHref = () => `${PATH}/`

export const isFileDropPath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

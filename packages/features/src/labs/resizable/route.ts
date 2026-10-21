const PATH = "/labs/ui/resizable"

export const resizableHref = (): string => `${PATH}/`

export const isResizablePath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

const PATH = "/labs/dialog/popover"

export const popoverHref = (): string => `${PATH}/`

export const isPopoverPath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

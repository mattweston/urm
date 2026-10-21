const PATH = "/labs/media/icons"

export const iconsHref = () => `${PATH}/`

export const isIconsPath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

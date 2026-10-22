const PATH = "/media/pixel-art"

export const pixelArtHref = (): string => `${PATH}/`

export const isPixelArtPath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

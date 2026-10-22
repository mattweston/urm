const PATH = "/media/music-notation"

export const musicNotationHref = () => `${PATH}/`

export const isMusicNotationPath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

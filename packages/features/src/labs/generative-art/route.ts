const PATH = "/media/generative-art"

export const generativeArtHref = () => `${PATH}/`

export const isGenerativeArtPath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

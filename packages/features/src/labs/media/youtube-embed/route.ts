const PATH = "/labs/media/youtube-embed"

export const youtubeEmbedHref = (): string => `${PATH}/`

export const isYouTubeEmbedPath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

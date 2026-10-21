const BASE = "/labs/media/social-links"

export const isSocialLinksPath = (pathname: string): boolean =>
    pathname === BASE || pathname === `${BASE}/`

export const socialLinksHref = (): string => `${BASE}/`

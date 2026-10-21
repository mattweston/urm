const BASE = "/design"

/** Claims the whole subtree: the administration surface will hold its own
 *  routes for entities, layouts, components and theme. */
export const isAppScope = (pathname: string): boolean =>
    pathname === BASE || pathname.startsWith(`${BASE}/`)

export const designHref = () => `${BASE}/`
export const designMainLayoutHref = () => `${BASE}/layouts/main-layout`
export const designFaviconsHref = () => `${BASE}/favicons`
export const designLogoHref = () => `${BASE}/logo`
export const isMainLayoutPath = (pathname: string): boolean =>
    pathname.startsWith(designMainLayoutHref())
export const designDocumentsHref = () => "/documents"
export const designDomainsHref = () => "/domains"

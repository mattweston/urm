const BASE = "/domains"

/** A single page today, so the scope is the exact path rather than a subtree.
 *  Widen this alongside the first nested route. */
export const isAppScope = (pathname: string): boolean =>
    pathname === BASE || pathname === `${BASE}/`

export const domainsHref = () => `${BASE}/`

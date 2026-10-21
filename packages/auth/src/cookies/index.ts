/**
 * # Cookies
 *
 * HMAC-SHA256 cookie signing, verification, and header parsing.
 *
 * All signing shares one secret, from `AuthConfig` in `@urm/env/server`.
 */
export { signCookie } from "./sign-cookie.ts"
export { verifyCookie } from "./verify-cookie.ts"
export { verifyDomainCookie } from "./verify-domain-cookie.ts"
export { signDomainCookie } from "./sign-domain-cookies.ts"
export { parseCookies } from "./parse-cookies.ts"
export {
    PKCE_COOKIE_OPTS,
    PKCE_COOKIE_CLEAR,
    AUTH_COOKIE_OPTS,
    AUTH_COOKIE_CLEAR,
    cookieHeader,
} from "./cookie-opts.ts"
export { getContactID } from "./get-contact.ts"

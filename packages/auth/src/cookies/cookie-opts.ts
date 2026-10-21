/**
 * # Cookie Options
 *
 * `Set-Cookie` option strings for session and PKCE cookies.
 */

type CookieOptionConfig = Readonly<{
    cookie_domain: string
    secure: boolean
}>

type CookieOptions = Readonly<{
    auth_cookie_opts: string
    auth_cookie_clear: string
    pkce_cookie_opts: string
    pkce_cookie_clear: string
}>

const cookieSecure = (): boolean =>
    process.env.NODE_ENV === "production" ||
    process.env.COOKIE_SECURE === "true"

const appendCookieParts = (parts: ReadonlyArray<string>): string =>
    parts.filter((part) => part !== "").join("; ")

export const buildCookieOptions = (
    config: CookieOptionConfig
): CookieOptions => {
    const normalizedDomain = config.cookie_domain
        .trim()
        .toLowerCase()
        .replace(/^\./, "")

    // A cookie scoped to the platform apex is sent to every customer domain
    // hosted under it. The only legal scopes are a customer's own apex or the
    // empty string, which keeps the cookie host-only.
    if (normalizedDomain === "urm.dev") {
        throw new Error(
            "Central cookies must be host-only; .urm.dev is not a valid cookie scope"
        )
    }

    const domainPart =
        config.cookie_domain === "" ? "" : `Domain=${config.cookie_domain}`
    const securePart = config.secure ? "Secure" : ""

    return {
        pkce_cookie_opts: appendCookieParts([
            "HttpOnly",
            "Path=/",
            "SameSite=Lax",
            "Max-Age=600",
            securePart,
            domainPart,
        ]),
        pkce_cookie_clear: appendCookieParts([
            "Path=/",
            "SameSite=Lax",
            "Max-Age=0",
            securePart,
            domainPart,
        ]),
        auth_cookie_opts: appendCookieParts([
            "HttpOnly",
            "Path=/",
            "SameSite=Lax",
            "Max-Age=34560000",
            securePart,
            domainPart,
        ]),
        auth_cookie_clear: appendCookieParts([
            "Path=/",
            "SameSite=Lax",
            "Max-Age=0",
            securePart,
            domainPart,
        ]),
    }
}

// Evaluated once at import. Both the empty cookie_domain (which is what makes
// the four constants below host-only) and cookieSecure()'s read of process.env
// are frozen here — setting COOKIE_SECURE later has no effect.
const COOKIE_OPTIONS = buildCookieOptions({
    cookie_domain: "",
    secure: cookieSecure(),
})

export const PKCE_COOKIE_OPTS = COOKIE_OPTIONS.pkce_cookie_opts
export const PKCE_COOKIE_CLEAR = COOKIE_OPTIONS.pkce_cookie_clear
export const AUTH_COOKIE_OPTS = COOKIE_OPTIONS.auth_cookie_opts
export const AUTH_COOKIE_CLEAR = COOKIE_OPTIONS.auth_cookie_clear

export const buildDomainSessionCookieOptions = (cookie_domain: string) =>
    buildCookieOptions({
        cookie_domain,
        secure: cookieSecure(),
    })

export function cookieHeader(
    name: string,
    value: string,
    opts: string
): string {
    return `${name}=${encodeURIComponent(value)}; ${opts}`
}

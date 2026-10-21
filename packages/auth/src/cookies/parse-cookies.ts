/**
 * # Parse Cookies
 *
 * Parse a `Cookie` request header into a name → value record.
 */

// Values come back raw. `cookieHeader` encodes on the way out, so any cookie
// carrying arbitrary text needs decodeURIComponent after parsing. Signed
// cookies survive untouched — base64url and hex contain nothing
// encodeURIComponent escapes.
export function parseCookies(
    cookieHeader: string | undefined
): Record<string, string> {
    if (!cookieHeader) {
        return {}
    }

    const cookies: Record<string, string> = {}
    cookieHeader.split(";").forEach((cookie) => {
        const [name, ...rest] = cookie.trim().split("=")
        if (name && rest.length > 0) {
            cookies[name] = rest.join("=")
        }
    })

    return cookies
}

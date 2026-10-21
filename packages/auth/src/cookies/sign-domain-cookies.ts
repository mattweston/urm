/**
 * # Sign Domain Cookies
 *
 * HMAC-SHA256 cookie signing scoped to a specific domain.
 */
import { signCookie } from "./sign-cookie.ts"

// The domain goes inside the signed payload, not beside it. Every tenant
// shares one secret, so a signature alone does not say which domain issued the
// cookie — without this, a valid cookie from one tenant authenticates its
// holder on all of them.
export function signDomainCookie(
    contactId: string,
    domainId: string,
    secret: string
): string {
    const scopedValue = `${contactId}::${domainId}`
    return signCookie(scopedValue, secret)
}

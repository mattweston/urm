/**
 * # Verify Domain Cookies
 *
 * Domain-scoped cookie verification.
 */
import { verifyCookie } from "./verify-cookie.ts"

export function verifyDomainCookie(
    signedValue: string,
    domainId: string,
    secret: string
): string | undefined {
    const verified = verifyCookie(signedValue, secret)
    if (!verified) {
        return undefined
    }

    const parts = verified.split("::")
    if (parts.length !== 2) {
        return undefined
    }

    const [contactId, cookieDomainId] = parts
    if (!contactId || !cookieDomainId) {
        return undefined
    }

    // Reject if domain doesn't match
    if (cookieDomainId !== domainId) {
        return undefined
    }

    return contactId
}

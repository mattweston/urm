import { createHmac, timingSafeEqual } from "node:crypto"
import {
    DOMAIN_LOGIN_INTENT_TTL_MS,
    domainLoginIntentPayload,
    type DomainLoginDestination,
} from "./domain-login-intent-payload.ts"

export {
    DOMAIN_LOGIN_INTENT_TTL_MS,
    domainLoginIntentPayload,
} from "./domain-login-intent-payload.ts"
export type { DomainLoginDestination } from "./domain-login-intent-payload.ts"

export type DomainLoginIntent = Readonly<{
    hostname: string
    destination: DomainLoginDestination
    expires_at: number
    signature: string
}>

const MAX_CLOCK_SKEW_MS = 5_000

const expectedSignature = (
    hostname: string,
    destination: DomainLoginDestination,
    expires_at: number,
    domain_worker_token: string
): Buffer =>
    createHmac("sha256", domain_worker_token)
        .update(domainLoginIntentPayload(hostname, destination, expires_at))
        .digest()

const isDestination = (value: string): value is DomainLoginDestination =>
    value === "admin" || value === "marketing"

const isCanonicalHostname = (hostname: string): boolean => {
    try {
        return new URL(`https://${hostname}`).hostname === hostname
    } catch {
        return false
    }
}

/** Verify a short-lived hostname assertion issued by the matching domain worker. */
export const verifyDomainLoginIntent = (
    intent: DomainLoginIntent,
    domain_worker_token: string,
    now = Date.now()
): boolean => {
    if (
        domain_worker_token === "" ||
        !isCanonicalHostname(intent.hostname) ||
        !isDestination(intent.destination) ||
        !Number.isSafeInteger(intent.expires_at) ||
        intent.expires_at < now - MAX_CLOCK_SKEW_MS ||
        intent.expires_at > now + DOMAIN_LOGIN_INTENT_TTL_MS + MAX_CLOCK_SKEW_MS
    ) {
        return false
    }

    const received = Buffer.from(intent.signature, "base64url")
    const expected = expectedSignature(
        intent.hostname,
        intent.destination,
        intent.expires_at,
        domain_worker_token
    )

    return (
        received.length === expected.length &&
        timingSafeEqual(received, expected)
    )
}

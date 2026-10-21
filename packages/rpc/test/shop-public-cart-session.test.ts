import { describe, expect, it } from "vitest"
import {
    PUBLIC_CART_SESSION_TTL_MS,
    issue_public_cart_session,
    verify_public_cart_session,
} from "../src/handlers/shop/public-cart-session.ts"

const secret = "a-development-test-secret-that-is-long-enough"
const now = 1_790_000_000_000

describe("public Shop cart session", () => {
    it("issues an opaque, expiring token scoped to one domain", () => {
        const session = issue_public_cart_session("domain-1", secret, now)
        expect(
            verify_public_cart_session("domain-1", session.token, secret, now)
        ).toBe(session.session_id)
        expect(
            verify_public_cart_session("domain-2", session.token, secret, now)
        ).toBeNull()
        expect(
            verify_public_cart_session(
                "domain-1",
                session.token,
                secret,
                now + PUBLIC_CART_SESSION_TTL_MS
            )
        ).toBeNull()
    })

    it("rejects modified, malformed and wrongly signed tokens", () => {
        const session = issue_public_cart_session("domain-1", secret, now)
        const parts = session.token.split(".")
        expect(
            verify_public_cart_session(
                "domain-1",
                `${parts[0]}.${parts[1]}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`,
                secret,
                now
            )
        ).toBeNull()
        expect(
            verify_public_cart_session(
                "domain-1",
                session.token,
                `${secret}!`,
                now
            )
        ).toBeNull()
        expect(
            verify_public_cart_session("domain-1", "v1.invalid", secret, now)
        ).toBeNull()
    })

    it("generates a different session for each issuance", () => {
        const first = issue_public_cart_session("domain-1", secret, now)
        const second = issue_public_cart_session("domain-1", secret, now)
        expect(first.session_id).not.toBe(second.session_id)
    })
})

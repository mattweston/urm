import { createHmac } from "node:crypto"
import { describe, expect, it } from "vitest"
import { verify_zernio_signature } from "../src/http/social-webhook.ts"

describe("Zernio webhook signature", () => {
    const secret = "test-webhook-secret"
    const body = new TextEncoder().encode('{"event":"post.published","text":"café"}')
    const signature = createHmac("sha256", secret).update(body).digest("hex")

    it("accepts the exact signed bytes", () => {
        expect(verify_zernio_signature(body, signature, secret)).toBe(true)
    })

    it("rejects tampering, missing credentials and malformed signatures", () => {
        const changed = new TextEncoder().encode('{"event":"post.failed","text":"café"}')
        expect(verify_zernio_signature(changed, signature, secret)).toBe(false)
        expect(verify_zernio_signature(body, null, secret)).toBe(false)
        expect(verify_zernio_signature(body, "not-hex", secret)).toBe(false)
        expect(verify_zernio_signature(body, signature, "")).toBe(false)
    })
})

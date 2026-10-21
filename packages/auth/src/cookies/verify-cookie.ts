/**
 * # Verify Cookies
 *
 * HMAC-SHA256 signed-cookie verification.
 */
import { createHmac, timingSafeEqual } from "node:crypto"

const SIGNED_COOKIE_VERSION = "v1"

const decodePayload = (payload: string): string | undefined => {
    try {
        return Buffer.from(payload, "base64url").toString("utf8")
    } catch {
        return undefined
    }
}

// timingSafeEqual, not ===. A short-circuiting compare leaks signature bytes
// through response timing, letting an attacker forge one byte at a time.
const equalSignatures = (left: string, right: string): boolean => {
    const leftBuffer = Buffer.from(left, "hex")
    const rightBuffer = Buffer.from(right, "hex")

    if (leftBuffer.length !== rightBuffer.length) {
        return false
    }

    return timingSafeEqual(leftBuffer, rightBuffer)
}

export function verifyCookie(
    signedValue: string,
    secret: string
): string | undefined {
    const parts = signedValue.split(".")

    if (parts.length !== 3) {
        return undefined
    }

    const [version, payload, signature] = parts

    if (version !== SIGNED_COOKIE_VERSION || !payload || !signature) {
        return undefined
    }

    const expectedSignature = createHmac("sha256", secret)
        .update(payload)
        .digest("hex")

    if (!equalSignatures(signature, expectedSignature)) {
        return undefined
    }

    return decodePayload(payload)
}

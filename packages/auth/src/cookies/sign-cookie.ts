/**
 * # Sign Cookies
 *
 * HMAC-SHA256 cookie signing.
 */
import { createHmac } from "node:crypto"

const SIGNED_COOKIE_VERSION = "v1"

const encodePayload = (value: string): string =>
    Buffer.from(value, "utf8").toString("base64url")

// Integrity only, not confidentiality. The payload is base64url and anyone
// holding the cookie can read it — never sign anything you would not put in a
// query string.
export function signCookie(value: string, secret: string): string {
    const payload = encodePayload(value)
    const signature = createHmac("sha256", secret).update(payload).digest("hex")
    return `${SIGNED_COOKIE_VERSION}.${payload}.${signature}`
}

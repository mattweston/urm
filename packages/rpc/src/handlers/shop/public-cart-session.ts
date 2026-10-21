import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import { Schema } from "effect"

const Payload = Schema.Struct({
    domain_id: Schema.String,
    session_id: Schema.String,
    expires_at: Schema.Number,
})

export const PUBLIC_CART_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1_000
const version = "v1"
const signature = (payload: string, secret: string) =>
    createHmac("sha256", secret).update(`${version}.${payload}`).digest()

export const issue_public_cart_session = (
    domain_id: string,
    secret: string,
    now = Date.now()
) => {
    if (domain_id.length === 0 || Buffer.byteLength(secret) < 32)
        throw new Error("Public cart session configuration is invalid")
    const session_id = randomBytes(32).toString("base64url")
    const expires_at = now + PUBLIC_CART_SESSION_TTL_MS
    const payload = Buffer.from(
        JSON.stringify({ domain_id, session_id, expires_at })
    ).toString("base64url")
    return {
        session_id,
        expires_at,
        token: `${version}.${payload}.${signature(payload, secret).toString("base64url")}`,
    }
}

export const verify_public_cart_session = (
    domain_id: string,
    token: string,
    secret: string,
    now = Date.now()
): string | null => {
    if (
        domain_id.length === 0 ||
        Buffer.byteLength(secret) < 32 ||
        token.length > 1_024 ||
        !Number.isSafeInteger(now)
    )
        return null
    const parts = token.split(".")
    if (
        parts.length !== 3 ||
        parts[0] !== version ||
        !/^[A-Za-z0-9_-]+$/.test(parts[1] ?? "") ||
        !/^[A-Za-z0-9_-]{43}$/.test(parts[2] ?? "")
    )
        return null
    const payload = parts[1] ?? ""
    const received = Buffer.from(parts[2] ?? "", "base64url")
    const expected = signature(payload, secret)
    if (
        received.length !== expected.length ||
        !timingSafeEqual(received, expected)
    )
        return null
    try {
        const decoded: unknown = JSON.parse(
            Buffer.from(payload, "base64url").toString("utf8")
        )
        const session = Schema.decodeUnknownSync(Payload)(decoded)
        if (
            session.domain_id !== domain_id ||
            !/^[A-Za-z0-9_-]{43}$/.test(session.session_id) ||
            !Number.isSafeInteger(session.expires_at) ||
            session.expires_at <= now ||
            session.expires_at > now + PUBLIC_CART_SESSION_TTL_MS
        )
            return null
        return session.session_id
    } catch {
        return null
    }
}

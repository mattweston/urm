/**
 * # Rand Utils
 *
 * Integer in range (`randBetween`, `randInt`) and short random ID string (`randID`).
 */

// Math.random — presentation only (DOM keys, sampling). Never use these for
// tokens, session ids, or anything an attacker benefits from guessing.
export const randBetween = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min) + min)

export const randInt = (max: number) => randBetween(0, max)

export const randID = () => Math.random().toString(36).slice(2)

/**
 * Creates a hexadecimal identifier for non-security uses, with a weak fallback.
 *
 * Browser `crypto.randomUUID()` requires a secure context and can be absent on
 * the plain-HTTP remote development hostname. `getRandomValues` is available in
 * insecure contexts too, so this helper uses it when present. The restriction
 * concerns the browser origin, not the operating system hosting development.
 *
 * If `crypto` or `getRandomValues` is unavailable, this implementation falls back
 * to `Math.random` without checking the environment. It cannot guarantee
 * unguessability. Never use it for session/reset tokens, secrets or capability
 * identifiers whose security depends on unpredictability. Such callers must use
 * a cryptographic source and fail when it is unavailable, including in tests
 * and development. See the auth package README for production and UUID guidance.
 */
export const randomHexId = (bytes = 16) => {
    const buffer = new Uint8Array(bytes)
    if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
        crypto.getRandomValues(buffer)
    } else {
        for (let index = 0; index < buffer.length; index += 1) {
            buffer[index] = Math.floor(Math.random() * 256)
        }
    }
    return Array.from(buffer, (byte) =>
        byte.toString(16).padStart(2, "0")
    ).join("")
}

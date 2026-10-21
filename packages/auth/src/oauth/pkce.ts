/**
 * # PKCE
 *
 * OAuth `state` and `code_verifier` encoding for the Google authorization flow.
 */

export const GOOGLE_OAUTH_COOKIE = "google_oauth_pkce"

// Base64url only — neither signed nor encrypted, and deliberately so.
// Integrity comes from comparing the decoded `state` against the value the
// provider echoes back at callback time, so an attacker who rewrites this
// cookie only breaks their own flow. Nothing may trust a decoded field before
// that comparison passes.
export function encodePkce(state: string, codeVerifier: string): string {
    return Buffer.from(
        JSON.stringify({ state, code_verifier: codeVerifier }),
        "utf-8"
    ).toString("base64url")
}

// Total — returns null for bad base64, malformed JSON, missing fields or wrong
// types rather than throwing, because the input is a cookie the user controls.
export function decodePkce(
    value: string
): { state: string; code_verifier: string } | null {
    try {
        const json = Buffer.from(value, "base64url").toString("utf-8")
        const o = JSON.parse(json) as { state?: string; code_verifier?: string }
        if (
            typeof o.state === "string" &&
            typeof o.code_verifier === "string"
        ) {
            return { state: o.state, code_verifier: o.code_verifier }
        }
    } catch {
        // ignore
    }
    return null
}

/**
 * # Password Policy
 *
 * Length-only validation. Composition rules are deliberately absent.
 */
export type PasswordPolicyFailureReason = "too_short" | "too_long" | "blank"

export type PasswordPolicyFailure = Readonly<{
    valid: false
    reason: PasswordPolicyFailureReason
}>

export type PasswordPolicySuccess = Readonly<{
    valid: true
}>

export type PasswordPolicyResult = PasswordPolicySuccess | PasswordPolicyFailure

export type PasswordPolicyOptions = Readonly<{
    min_length: number
    max_length: number
}>

// Twelve characters with no composition rules follows NIST 800-63B: length
// plus a breach check beats forced symbols, which push people toward
// "Password1!". The ceiling is a DoS guard, not a security property — scrypt
// cost scales with input length.
export const DEFAULT_PASSWORD_POLICY: PasswordPolicyOptions = {
    min_length: 12,
    max_length: 1024,
}

export const validatePasswordPolicy = (
    password: string,
    options: PasswordPolicyOptions = DEFAULT_PASSWORD_POLICY
): PasswordPolicyResult => {
    if (password.trim() === "") {
        return { valid: false, reason: "blank" }
    }

    if (password.length < options.min_length) {
        return { valid: false, reason: "too_short" }
    }

    if (password.length > options.max_length) {
        return { valid: false, reason: "too_long" }
    }

    return { valid: true }
}

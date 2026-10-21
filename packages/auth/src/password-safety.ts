/**
 * # Password Safety
 *
 * Length policy plus the HIBP breach check. Single entry point for accepting
 * a new password.
 */
import { Effect, Metric } from "effect"
import {
    checkPwnedPassword,
    type PwnedPasswordFetch,
} from "./pwned-passwords.ts"
import {
    validatePasswordPolicy,
    type PasswordPolicyFailureReason,
} from "./password-policy.ts"

const authPasswordPolicyTotal = Metric.counter(
    "auth_password_policy_total"
).pipe(Metric.withConstantInput(1))

export type PasswordSafetyFailureReason =
    | PasswordPolicyFailureReason
    | "pwned"
    | "check_unavailable"

export type PasswordSafetyFailure = Readonly<{
    valid: false
    reason: PasswordSafetyFailureReason
}>

export type PasswordSafetySuccess = Readonly<{
    valid: true
}>

export type PasswordSafetyResult = PasswordSafetySuccess | PasswordSafetyFailure

export type PasswordSafetyOptions = Readonly<{
    pwned_passwords_enabled: boolean
    pwned_passwords_fail_closed: boolean
    pwned_passwords_timeout_ms: number
    pwned_passwords_cache_ttl_ms: number
    fetch_range?: PwnedPasswordFetch
}>

export const validatePasswordSafety = (
    password: string,
    options: PasswordSafetyOptions
): Effect.Effect<PasswordSafetyResult, never> =>
    Effect.gen(function* () {
        let result: PasswordSafetyResult
        const policy = validatePasswordPolicy(password)

        if (!policy.valid) {
            result = policy
        } else if (!options.pwned_passwords_enabled) {
            result = { valid: true }
        } else {
            const check = yield* checkPwnedPassword(
                password,
                {
                    timeout_ms: options.pwned_passwords_timeout_ms,
                    cache_ttl_ms: options.pwned_passwords_cache_ttl_ms,
                },
                options.fetch_range
            ).pipe(Effect.catch(() => Effect.succeed(undefined)))

            // fail_closed makes api.pwnedpasswords.com a hard dependency of
            // every flow that sets a password, including the reset a
            // locked-out user needs. Failing open lets some breached
            // passwords through during an outage. Neither default is safe by
            // accident — set it deliberately.
            if (check === undefined) {
                result = options.pwned_passwords_fail_closed
                    ? { valid: false, reason: "check_unavailable" }
                    : { valid: true }
            } else if (check.pwned) {
                result = { valid: false, reason: "pwned" }
            } else {
                result = { valid: true }
            }
        }

        yield* Effect.track(
            Effect.void,
            authPasswordPolicyTotal.pipe(
                Metric.withAttributes({
                    result: result.valid ? "valid" : "invalid",
                    reason: result.valid ? "none" : result.reason,
                })
            )
        )

        return result
    })

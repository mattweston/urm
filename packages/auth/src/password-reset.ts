/**
 * # Password Reset
 *
 * Single-use, 30-minute reset tokens. Redeeming one only marks it spent — the
 * caller changes the password and revokes sessions.
 */
import { createHash, randomBytes } from "node:crypto"
import { Effect, Metric } from "effect"
import type { DatabaseOperationError } from "@urm/db"
import { AuthPersistence } from "./auth-persistence.ts"

const authPasswordResetTotal = Metric.counter("auth_password_reset_total").pipe(
    Metric.withConstantInput(1)
)

// 30 minutes, against 24 hours for an email verification token. A reset link is
// a bearer credential for the whole account; a verification link only confirms
// an address the user already supplied.
export const PASSWORD_RESET_TOKEN_TTL_MS = 1000 * 60 * 30

export type PasswordResetTokenContext = Readonly<{
    request_ip_hash?: string | undefined
    user_agent_hash?: string | undefined
}>

export type CreatedPasswordResetToken = Readonly<{
    id: string
    token: string
    expires_at: number
}>

export type ConsumedPasswordResetToken = Readonly<{
    id: string
    contact_id: string
    email: string
}>

export type ActivePasswordResetToken = Readonly<{
    id: string
    contact_id: string
    email: string
}>

export const newPasswordResetToken = (): string =>
    randomBytes(32).toString("base64url")

export const hashPasswordResetToken = (token: string): string =>
    createHash("sha256").update(token).digest("hex")

export const createPasswordResetToken = (
    contact_id: string,
    email: string,
    context: PasswordResetTokenContext = {}
): Effect.Effect<
    CreatedPasswordResetToken,
    DatabaseOperationError,
    AuthPersistence
> =>
    Effect.gen(function* () {
        yield* Effect.annotateLogs({ contact_id })(Effect.void)
        yield* Effect.annotateSpans({ contact_id })(Effect.void)
        const persistence = yield* AuthPersistence
        const now = Date.now()
        const token = newPasswordResetToken()
        const expires_at = now + PASSWORD_RESET_TOKEN_TTL_MS
        const id = yield* persistence.createPasswordResetToken({
            contact_id,
            email,
            token_hash: hashPasswordResetToken(token),
            expires_at,
            created_at: now,
            context,
        })

        return {
            id,
            token,
            expires_at,
        }
    }).pipe(
        Effect.flatMap((token) =>
            Effect.track(
                Effect.void,
                authPasswordResetTotal.pipe(
                    Metric.withAttributes({
                        stage: "requested",
                        result: "succeeded",
                    })
                )
            ).pipe(Effect.as(token))
        ),
        Effect.withSpan("auth.password_reset.token.create"),
        Effect.withLogSpan("auth.password_reset.token.create")
    )

// Resolves without consuming, so the "choose a new password" form survives a
// reload. Spending the token on page load would break the flow for anyone who
// refreshes.
export const findActivePasswordResetToken = (
    token: string
): Effect.Effect<
    ActivePasswordResetToken | undefined,
    DatabaseOperationError,
    AuthPersistence
> =>
    Effect.gen(function* () {
        const persistence = yield* AuthPersistence
        const now = Date.now()
        const token_hash = hashPasswordResetToken(token)
        const resetToken = yield* persistence.findActivePasswordResetToken(
            token_hash,
            now
        )

        if (resetToken === undefined) {
            return undefined
        }

        yield* Effect.annotateLogs({ contact_id: resetToken.contact_id })(
            Effect.void
        )
        yield* Effect.annotateSpans({ contact_id: resetToken.contact_id })(
            Effect.void
        )

        return {
            id: resetToken.id,
            contact_id: resetToken.contact_id,
            email: resetToken.email,
        }
    }).pipe(
        Effect.withSpan("auth.password_reset.token.find"),
        Effect.withLogSpan("auth.password_reset.token.find")
    )

// Only marks the token spent — unlike email verification, nothing on the
// contact changes here. Callers must follow with replacePasswordCredential and
// revokeContactAuthSessions, and the three steps are not atomic.
export const consumePasswordResetToken = (
    token: string
): Effect.Effect<
    ConsumedPasswordResetToken | undefined,
    DatabaseOperationError,
    AuthPersistence
> =>
    Effect.gen(function* () {
        const persistence = yield* AuthPersistence
        const now = Date.now()
        const resetToken = yield* persistence.consumePasswordResetToken(
            hashPasswordResetToken(token),
            now
        )

        if (resetToken === undefined) {
            return undefined
        }

        yield* Effect.annotateLogs({ contact_id: resetToken.contact_id })(
            Effect.void
        )
        yield* Effect.annotateSpans({ contact_id: resetToken.contact_id })(
            Effect.void
        )
        return {
            id: resetToken.id,
            contact_id: resetToken.contact_id,
            email: resetToken.email,
        }
    }).pipe(
        Effect.flatMap((result) =>
            Effect.track(
                Effect.void,
                authPasswordResetTotal.pipe(
                    Metric.withAttributes({
                        stage: "completed",
                        result: result === undefined ? "failed" : "succeeded",
                    })
                )
            ).pipe(Effect.as(result))
        ),
        Effect.withSpan("auth.password_reset.token.consume"),
        Effect.withLogSpan("auth.password_reset.token.consume")
    )

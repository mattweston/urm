/**
 * # Email Verification
 *
 * Single-use tokens for verifying a new address and for changing an existing
 * one. Both share one table, separated by `purpose`.
 */
import { createHash, randomBytes } from "node:crypto"
import { Effect, Metric } from "effect"
import type { DatabaseOperationError } from "@urm/database"
import { AuthPersistence } from "./auth-persistence.ts"

// The purpose tag is matched in the consume query, so a token issued to verify
// an address cannot be redeemed through the email-change path — which would
// otherwise move the account to whatever address the token carries.
export const EMAIL_VERIFICATION_PURPOSE = "verify_email"

export const EMAIL_VERIFICATION_TOKEN_TTL_MS = 1000 * 60 * 60 * 24

const authEmailVerificationTotal = Metric.counter(
    "auth_email_verification_total"
).pipe(Metric.withConstantInput(1))
const authEmailChangeTotal = Metric.counter("auth_email_change_total").pipe(
    Metric.withConstantInput(1)
)

export type EmailVerificationTokenContext = Readonly<{
    request_ip_hash?: string | undefined
    user_agent_hash?: string | undefined
}>

export type CreatedEmailVerificationToken = Readonly<{
    id: string
    token: string
    expires_at: number
}>

export type ConsumedEmailVerificationToken = Readonly<{
    id: string
    contact_id: string
    email: string
}>

export const newEmailVerificationToken = (): string =>
    randomBytes(32).toString("base64url")

// Unsalted SHA-256 is correct here and would not be for a password: the input
// is already 32 bytes of entropy, so there is nothing to brute-force and
// nothing a rainbow table can precompute. Only the hash is persisted.
export const hashEmailVerificationToken = (token: string): string =>
    createHash("sha256").update(token).digest("hex")

export const createEmailVerificationToken = (
    contact_id: string,
    email: string,
    context: EmailVerificationTokenContext = {}
): Effect.Effect<
    CreatedEmailVerificationToken,
    DatabaseOperationError,
    AuthPersistence
> =>
    Effect.gen(function* () {
        yield* Effect.annotateLogs({ contact_id })(Effect.void)
        yield* Effect.annotateSpans({ contact_id })(Effect.void)
        const persistence = yield* AuthPersistence
        const now = Date.now()
        const token = newEmailVerificationToken()
        const expires_at = now + EMAIL_VERIFICATION_TOKEN_TTL_MS
        const id = yield* persistence.createEmailVerificationToken({
            contact_id,
            email,
            token_hash: hashEmailVerificationToken(token),
            purpose: EMAIL_VERIFICATION_PURPOSE,
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
                authEmailVerificationTotal.pipe(
                    Metric.withAttributes({
                        stage: "requested",
                        result: "succeeded",
                    })
                )
            ).pipe(Effect.as(token))
        ),
        Effect.withSpan("auth.email_verification.token.create"),
        Effect.withLogSpan("auth.email_verification.token.create")
    )

export const consumeEmailVerificationToken = (
    token: string
): Effect.Effect<
    ConsumedEmailVerificationToken | undefined,
    DatabaseOperationError,
    AuthPersistence
> =>
    Effect.gen(function* () {
        const persistence = yield* AuthPersistence
        const now = Date.now()
        const token_hash = hashEmailVerificationToken(token)
        const verificationToken =
            yield* persistence.consumeEmailVerificationToken(
                token_hash,
                EMAIL_VERIFICATION_PURPOSE,
                now
            )

        if (verificationToken === undefined) {
            return undefined
        }

        yield* Effect.annotateLogs({
            contact_id: verificationToken.contact_id,
        })(Effect.void)
        yield* Effect.annotateSpans({
            contact_id: verificationToken.contact_id,
        })(Effect.void)
        return {
            id: verificationToken.id,
            contact_id: verificationToken.contact_id,
            email: verificationToken.email,
        }
    }).pipe(
        Effect.flatMap((result) =>
            Effect.track(
                Effect.void,
                authEmailVerificationTotal.pipe(
                    Metric.withAttributes({
                        stage: "completed",
                        result: result === undefined ? "failed" : "succeeded",
                    })
                )
            ).pipe(Effect.as(result))
        ),
        Effect.withSpan("auth.email_verification.token.consume"),
        Effect.withLogSpan("auth.email_verification.token.consume")
    )

export const EMAIL_CHANGE_PURPOSE = "change_email"

export type EmailChangeTokenContext = EmailVerificationTokenContext

export type CreatedEmailChangeToken = CreatedEmailVerificationToken

export type ConsumedEmailChangeToken = ConsumedEmailVerificationToken

export const createEmailChangeToken = (
    contact_id: string,
    new_email: string,
    context: EmailChangeTokenContext = {}
): Effect.Effect<
    CreatedEmailChangeToken,
    DatabaseOperationError,
    AuthPersistence
> =>
    Effect.gen(function* () {
        yield* Effect.annotateLogs({ contact_id })(Effect.void)
        yield* Effect.annotateSpans({ contact_id })(Effect.void)
        const persistence = yield* AuthPersistence
        const now = Date.now()
        const token = newEmailVerificationToken()
        const expires_at = now + EMAIL_VERIFICATION_TOKEN_TTL_MS
        const id = yield* persistence.createEmailVerificationToken({
            contact_id,
            email: new_email,
            token_hash: hashEmailVerificationToken(token),
            purpose: EMAIL_CHANGE_PURPOSE,
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
                authEmailChangeTotal.pipe(
                    Metric.withAttributes({
                        stage: "requested",
                        result: "succeeded",
                    })
                )
            ).pipe(Effect.as(token))
        ),
        Effect.withSpan("auth.email_change.token.create"),
        Effect.withLogSpan("auth.email_change.token.create")
    )

export const consumeEmailChangeToken = (
    token: string
): Effect.Effect<
    ConsumedEmailChangeToken | undefined,
    DatabaseOperationError,
    AuthPersistence
> =>
    Effect.gen(function* () {
        const persistence = yield* AuthPersistence
        const now = Date.now()
        const token_hash = hashEmailVerificationToken(token)
        const changeToken = yield* persistence.consumeEmailVerificationToken(
            token_hash,
            EMAIL_CHANGE_PURPOSE,
            now
        )

        if (changeToken === undefined) {
            return undefined
        }

        yield* Effect.annotateLogs({ contact_id: changeToken.contact_id })(
            Effect.void
        )
        yield* Effect.annotateSpans({ contact_id: changeToken.contact_id })(
            Effect.void
        )
        return {
            id: changeToken.id,
            contact_id: changeToken.contact_id,
            email: changeToken.email,
        }
    }).pipe(
        Effect.flatMap((result) =>
            Effect.track(
                Effect.void,
                authEmailChangeTotal.pipe(
                    Metric.withAttributes({
                        stage: "completed",
                        result: result === undefined ? "failed" : "succeeded",
                    })
                )
            ).pipe(Effect.as(result))
        ),
        Effect.withSpan("auth.email_change.token.consume"),
        Effect.withLogSpan("auth.email_change.token.consume")
    )

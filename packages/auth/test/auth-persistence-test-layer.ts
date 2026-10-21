import { Context, Effect, Layer } from "effect"
import {
    AuthPersistence,
    type AuthOAuthState,
    type AuthRateLimitBucket,
    type AuthToken,
} from "../src/auth-persistence.ts"

type PasswordResetToken = AuthToken & {
    token_hash: string
    expires_at: number
    consumed_at?: number
}

type EmailVerificationToken = AuthToken & {
    token_hash: string
    purpose: string
    expires_at: number
    consumed_at?: number
}

type OAuthState = AuthOAuthState & {
    state_hash: string
    code_verifier_hash: string
    expires_at: number
    consumed_at?: number
}

export type AuthPersistenceTestStateShape = {
    readonly verified_contact_ids: Array<string>
}

export class AuthPersistenceTestState extends Context.Service<
    AuthPersistenceTestState,
    AuthPersistenceTestStateShape
>()("@urm/auth/test/AuthPersistenceTestState") {}

export const makeAuthPersistenceTestLive = (): Layer.Layer<
    AuthPersistence | AuthPersistenceTestState
> => {
    const password_reset_tokens: Array<PasswordResetToken> = []
    const email_verification_tokens: Array<EmailVerificationToken> = []
    const oauth_states: Array<OAuthState> = []
    const rate_limit_buckets = new Map<string, AuthRateLimitBucket>()
    const state = AuthPersistenceTestState.of({ verified_contact_ids: [] })
    let next_id = 1
    const newId = (): string => `test-${next_id++}`
    const rateLimitBucketKey = (
        key: string,
        route: string,
        window_start: number
    ): string => `${key}:${route}:${window_start}`

    return Layer.merge(
        Layer.succeed(AuthPersistenceTestState, state),
        Layer.succeed(
            AuthPersistence,
            AuthPersistence.of({
                createPasswordResetToken: (input) =>
                    Effect.sync(() => {
                        const id = newId()
                        password_reset_tokens.push({
                            id,
                            contact_id: input.contact_id,
                            email: input.email,
                            token_hash: input.token_hash,
                            expires_at: input.expires_at,
                        })
                        return id
                    }),
                findActivePasswordResetToken: (token_hash, now) =>
                    Effect.sync(() => {
                        const token = password_reset_tokens.find(
                            (candidate) =>
                                candidate.token_hash === token_hash &&
                                candidate.consumed_at === undefined &&
                                candidate.expires_at > now
                        )
                        return token === undefined
                            ? undefined
                            : {
                                  id: token.id,
                                  contact_id: token.contact_id,
                                  email: token.email,
                              }
                    }),
                consumePasswordResetToken: (token_hash, now) =>
                    Effect.sync(() => {
                        const token = password_reset_tokens.find(
                            (candidate) =>
                                candidate.token_hash === token_hash &&
                                candidate.consumed_at === undefined &&
                                candidate.expires_at > now
                        )
                        if (token === undefined) {
                            return undefined
                        }
                        token.consumed_at = now
                        return {
                            id: token.id,
                            contact_id: token.contact_id,
                            email: token.email,
                        }
                    }),
                createEmailVerificationToken: (input) =>
                    Effect.sync(() => {
                        const id = newId()
                        email_verification_tokens.push({
                            id,
                            contact_id: input.contact_id,
                            email: input.email,
                            token_hash: input.token_hash,
                            purpose: input.purpose,
                            expires_at: input.expires_at,
                        })
                        return id
                    }),
                consumeEmailVerificationToken: (token_hash, purpose, now) =>
                    Effect.sync(() => {
                        const token = email_verification_tokens.find(
                            (candidate) =>
                                candidate.token_hash === token_hash &&
                                candidate.purpose === purpose &&
                                candidate.consumed_at === undefined &&
                                candidate.expires_at > now
                        )
                        if (token === undefined) {
                            return undefined
                        }
                        token.consumed_at = now
                        if (purpose === "verify_email") {
                            state.verified_contact_ids.push(token.contact_id)
                        }
                        return {
                            id: token.id,
                            contact_id: token.contact_id,
                            email: token.email,
                        }
                    }),
                createOAuthState: (input) =>
                    Effect.sync(() => {
                        const id = newId()
                        oauth_states.push({
                            id,
                            provider: input.provider,
                            state_hash: input.state_hash,
                            code_verifier_hash: input.code_verifier_hash,
                            expires_at: input.expires_at,
                            redirect_to: input.redirect_to,
                            host: input.host,
                            domain_id: input.domain_id,
                        })
                        return id
                    }),
                consumeOAuthState: (
                    provider,
                    state_hash,
                    code_verifier_hash,
                    now
                ) =>
                    Effect.sync(() => {
                        const oauth_state = oauth_states.find(
                            (candidate) =>
                                candidate.provider === provider &&
                                candidate.state_hash === state_hash &&
                                candidate.code_verifier_hash ===
                                    code_verifier_hash &&
                                candidate.consumed_at === undefined &&
                                candidate.expires_at > now
                        )
                        if (oauth_state === undefined) {
                            return undefined
                        }
                        oauth_state.consumed_at = now
                        return {
                            id: oauth_state.id,
                            provider: oauth_state.provider,
                            redirect_to: oauth_state.redirect_to,
                            host: oauth_state.host,
                            domain_id: oauth_state.domain_id,
                        }
                    }),
                findRateLimitBucket: (key, route, window_start) =>
                    Effect.sync(() =>
                        rate_limit_buckets.get(
                            rateLimitBucketKey(key, route, window_start)
                        )
                    ),
                createRateLimitBucket: (input) =>
                    Effect.sync(() => {
                        rate_limit_buckets.set(
                            rateLimitBucketKey(
                                input.key,
                                input.route,
                                input.window_start
                            ),
                            {
                                id: newId(),
                                count: 1,
                            }
                        )
                    }),
                updateRateLimitBucket: (id, count, blocked_until) =>
                    Effect.sync(() => {
                        for (const [key, bucket] of rate_limit_buckets) {
                            if (bucket.id === id) {
                                rate_limit_buckets.set(
                                    key,
                                    blocked_until === undefined
                                        ? { id, count }
                                        : { id, count, blocked_until }
                                )
                                return
                            }
                        }
                    }),
                recordRateLimitDenied: () => Effect.void,
            })
        )
    )
}

export const AuthPersistenceTestLive = makeAuthPersistenceTestLive()

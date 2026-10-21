/**
 * # Auth Persistence
 *
 * SQL for short-lived auth artefacts: reset and verification tokens, OAuth
 * states, rate-limit buckets. Policy and hashing live in the calling modules.
 */
import { and, eq, gt, isNull } from "drizzle-orm"
import { Context, Effect, Layer } from "effect"
import {
    DB,
    DatabaseOperationError,
    databaseOperationError,
    schema,
} from "@urm/database"

export type AuthTokenContext = Readonly<{
    request_ip_hash?: string | undefined
    user_agent_hash?: string | undefined
}>

export type AuthToken = Readonly<{
    id: string
    contact_id: string
    email: string
}>

export type AuthOAuthState = Readonly<{
    id: string
    provider: string
    redirect_to?: string | undefined
    host?: string | undefined
    domain_id?: string | undefined
}>

export type AuthRateLimitBucket = Readonly<{
    id: string
    count: number
    blocked_until?: number | undefined
}>

export type AuthPersistenceShape = {
    readonly createPasswordResetToken: (
        input: Readonly<{
            contact_id: string
            email: string
            token_hash: string
            expires_at: number
            created_at: number
            context: AuthTokenContext
        }>
    ) => Effect.Effect<string, DatabaseOperationError>
    readonly findActivePasswordResetToken: (
        token_hash: string,
        now: number
    ) => Effect.Effect<AuthToken | undefined, DatabaseOperationError>
    readonly consumePasswordResetToken: (
        token_hash: string,
        now: number
    ) => Effect.Effect<AuthToken | undefined, DatabaseOperationError>
    readonly createEmailVerificationToken: (
        input: Readonly<{
            contact_id: string
            email: string
            token_hash: string
            purpose: string
            expires_at: number
            created_at: number
            context: AuthTokenContext
        }>
    ) => Effect.Effect<string, DatabaseOperationError>
    readonly consumeEmailVerificationToken: (
        token_hash: string,
        purpose: string,
        now: number
    ) => Effect.Effect<AuthToken | undefined, DatabaseOperationError>
    readonly createOAuthState: (
        input: Readonly<{
            provider: string
            state_hash: string
            code_verifier_hash: string
            expires_at: number
            created_at: number
            redirect_to?: string | undefined
            host?: string | undefined
            domain_id?: string | undefined
            context: AuthTokenContext
        }>
    ) => Effect.Effect<string, DatabaseOperationError>
    readonly consumeOAuthState: (
        provider: string,
        state_hash: string,
        code_verifier_hash: string,
        now: number
    ) => Effect.Effect<AuthOAuthState | undefined, DatabaseOperationError>
    readonly findRateLimitBucket: (
        key: string,
        route: string,
        window_start: number
    ) => Effect.Effect<AuthRateLimitBucket | undefined, DatabaseOperationError>
    readonly createRateLimitBucket: (
        input: Readonly<{
            key: string
            route: string
            window_start: number
            window_seconds: number
            now: number
        }>
    ) => Effect.Effect<void, DatabaseOperationError>
    readonly updateRateLimitBucket: (
        id: string,
        count: number,
        blocked_until: number | undefined,
        now: number
    ) => Effect.Effect<void, DatabaseOperationError>
    readonly recordRateLimitDenied: (
        route: string,
        retry_after_seconds: number
    ) => Effect.Effect<void, DatabaseOperationError>
}

const persistenceFailure =
    (operation: string) =>
    <A, E, R>(
        effect: Effect.Effect<A, E, R>
    ): Effect.Effect<A, DatabaseOperationError, R> =>
        effect.pipe(
            Effect.mapError((cause) =>
                databaseOperationError(
                    operation,
                    "Auth persistence operation failed",
                    cause
                )
            )
        )

export class AuthPersistence extends Context.Service<
    AuthPersistence,
    AuthPersistenceShape
>()("@urm/auth/AuthPersistence") {}

export const AuthPersistenceLive = Layer.effect(
    AuthPersistence,
    Effect.gen(function* () {
        const db = yield* DB

        return AuthPersistence.of({
            createPasswordResetToken: (input) =>
                Effect.gen(function* () {
                    const inserted = yield* db
                        .insert(schema.auth_password_reset_tokens)
                        .values({
                            contact_id: input.contact_id,
                            email: input.email,
                            token_hash: input.token_hash,
                            expires_at: input.expires_at,
                            created_at: input.created_at,
                            request_ip_hash: input.context.request_ip_hash,
                            user_agent_hash: input.context.user_agent_hash,
                        })
                        .returning({ id: schema.auth_password_reset_tokens.id })
                    const token = inserted[0]
                    if (token === undefined) {
                        return yield* Effect.fail(
                            databaseOperationError(
                                "createPasswordResetToken",
                                "Insert returned no row"
                            )
                        )
                    }
                    return token.id
                }).pipe(persistenceFailure("createPasswordResetToken")),
            findActivePasswordResetToken: (token_hash, now) =>
                Effect.gen(function* () {
                    const tokens = yield* db
                        .select({
                            id: schema.auth_password_reset_tokens.id,
                            contact_id:
                                schema.auth_password_reset_tokens.contact_id,
                            email: schema.auth_password_reset_tokens.email,
                        })
                        .from(schema.auth_password_reset_tokens)
                        .where(
                            and(
                                eq(
                                    schema.auth_password_reset_tokens
                                        .token_hash,
                                    token_hash
                                ),
                                isNull(
                                    schema.auth_password_reset_tokens
                                        .consumed_at
                                ),
                                gt(
                                    schema.auth_password_reset_tokens
                                        .expires_at,
                                    now
                                )
                            )
                        )
                        .limit(1)
                    return tokens[0]
                }).pipe(persistenceFailure("findActivePasswordResetToken")),
            consumePasswordResetToken: (token_hash, now) =>
                Effect.gen(function* () {
                    const consumed = yield* db
                        .update(schema.auth_password_reset_tokens)
                        .set({ consumed_at: now })
                        .where(
                            and(
                                eq(
                                    schema.auth_password_reset_tokens
                                        .token_hash,
                                    token_hash
                                ),
                                isNull(
                                    schema.auth_password_reset_tokens
                                        .consumed_at
                                ),
                                gt(
                                    schema.auth_password_reset_tokens
                                        .expires_at,
                                    now
                                )
                            )
                        )
                        .returning({
                            id: schema.auth_password_reset_tokens.id,
                            contact_id:
                                schema.auth_password_reset_tokens.contact_id,
                            email: schema.auth_password_reset_tokens.email,
                        })
                    return consumed[0]
                }).pipe(persistenceFailure("consumePasswordResetToken")),
            createEmailVerificationToken: (input) =>
                Effect.gen(function* () {
                    const inserted = yield* db
                        .insert(schema.auth_email_verification_tokens)
                        .values({
                            contact_id: input.contact_id,
                            email: input.email,
                            token_hash: input.token_hash,
                            purpose: input.purpose,
                            expires_at: input.expires_at,
                            created_at: input.created_at,
                            request_ip_hash: input.context.request_ip_hash,
                            user_agent_hash: input.context.user_agent_hash,
                        })
                        .returning({
                            id: schema.auth_email_verification_tokens.id,
                        })
                    const token = inserted[0]
                    if (token === undefined) {
                        return yield* Effect.fail(
                            databaseOperationError(
                                "createEmailVerificationToken",
                                "Insert returned no row"
                            )
                        )
                    }
                    return token.id
                }).pipe(persistenceFailure("createEmailVerificationToken")),
            consumeEmailVerificationToken: (token_hash, purpose, now) =>
                Effect.gen(function* () {
                    const consumed = yield* db
                        .update(schema.auth_email_verification_tokens)
                        .set({ consumed_at: now })
                        .where(
                            and(
                                eq(
                                    schema.auth_email_verification_tokens
                                        .token_hash,
                                    token_hash
                                ),
                                eq(
                                    schema.auth_email_verification_tokens
                                        .purpose,
                                    purpose
                                ),
                                isNull(
                                    schema.auth_email_verification_tokens
                                        .consumed_at
                                ),
                                gt(
                                    schema.auth_email_verification_tokens
                                        .expires_at,
                                    now
                                )
                            )
                        )
                        .returning({
                            id: schema.auth_email_verification_tokens.id,
                            contact_id:
                                schema.auth_email_verification_tokens
                                    .contact_id,
                            email: schema.auth_email_verification_tokens.email,
                        })
                    const token = consumed[0]

                    if (token === undefined) {
                        return undefined
                    }

                    // Alone among the consume methods this has a second effect:
                    // consuming a change_email token *is* the email change.
                    // Not in a transaction with the update above.
                    yield* db
                        .update(schema.contacts)
                        .set(
                            purpose === "change_email"
                                ? {
                                      email: token.email,
                                      email_verified: true,
                                      updated_at: now,
                                  }
                                : { email_verified: true, updated_at: now }
                        )
                        .where(eq(schema.contacts.id, token.contact_id))
                    return token
                }).pipe(persistenceFailure("consumeEmailVerificationToken")),
            createOAuthState: (input) =>
                Effect.gen(function* () {
                    const inserted = yield* db
                        .insert(schema.auth_oauth_states)
                        .values({
                            provider: input.provider,
                            state_hash: input.state_hash,
                            code_verifier_hash: input.code_verifier_hash,
                            redirect_to: input.redirect_to,
                            host: input.host,
                            domain_id: input.domain_id,
                            expires_at: input.expires_at,
                            created_at: input.created_at,
                            request_ip_hash: input.context.request_ip_hash,
                            user_agent_hash: input.context.user_agent_hash,
                        })
                        .returning({ id: schema.auth_oauth_states.id })
                    const state = inserted[0]
                    if (state === undefined) {
                        return yield* Effect.fail(
                            databaseOperationError(
                                "createOAuthState",
                                "Insert returned no row"
                            )
                        )
                    }
                    return state.id
                }).pipe(persistenceFailure("createOAuthState")),
            consumeOAuthState: (
                provider,
                state_hash,
                code_verifier_hash,
                now
            ) =>
                Effect.gen(function* () {
                    const consumed = yield* db
                        .update(schema.auth_oauth_states)
                        .set({ consumed_at: now })
                        .where(
                            and(
                                eq(schema.auth_oauth_states.provider, provider),
                                eq(
                                    schema.auth_oauth_states.state_hash,
                                    state_hash
                                ),
                                eq(
                                    schema.auth_oauth_states.code_verifier_hash,
                                    code_verifier_hash
                                ),
                                isNull(schema.auth_oauth_states.consumed_at),
                                gt(schema.auth_oauth_states.expires_at, now)
                            )
                        )
                        .returning({
                            id: schema.auth_oauth_states.id,
                            provider: schema.auth_oauth_states.provider,
                            redirect_to: schema.auth_oauth_states.redirect_to,
                            host: schema.auth_oauth_states.host,
                            domain_id: schema.auth_oauth_states.domain_id,
                        })
                    const state = consumed[0]
                    return state === undefined
                        ? undefined
                        : {
                              ...state,
                              redirect_to: state.redirect_to ?? undefined,
                              host: state.host ?? undefined,
                              domain_id: state.domain_id ?? undefined,
                          }
                }).pipe(persistenceFailure("consumeOAuthState")),
            findRateLimitBucket: (key, route, window_start) =>
                Effect.gen(function* () {
                    const buckets = yield* db
                        .select({
                            id: schema.auth_rate_limit_buckets.id,
                            count: schema.auth_rate_limit_buckets.count,
                            blocked_until:
                                schema.auth_rate_limit_buckets.blocked_until,
                        })
                        .from(schema.auth_rate_limit_buckets)
                        .where(
                            and(
                                eq(schema.auth_rate_limit_buckets.key, key),
                                eq(schema.auth_rate_limit_buckets.route, route),
                                eq(
                                    schema.auth_rate_limit_buckets.window_start,
                                    window_start
                                )
                            )
                        )
                        .limit(1)
                    const bucket = buckets[0]
                    return bucket === undefined
                        ? undefined
                        : {
                              ...bucket,
                              blocked_until: bucket.blocked_until ?? undefined,
                          }
                }).pipe(persistenceFailure("findRateLimitBucket")),
            createRateLimitBucket: (input) =>
                db
                    .insert(schema.auth_rate_limit_buckets)
                    .values({
                        key: input.key,
                        route: input.route,
                        window_start: input.window_start,
                        window_seconds: input.window_seconds,
                        count: 1,
                        updated_at: input.now,
                    })
                    .pipe(
                        Effect.asVoid,
                        persistenceFailure("createRateLimitBucket")
                    ),
            updateRateLimitBucket: (id, count, blocked_until, now) =>
                db
                    .update(schema.auth_rate_limit_buckets)
                    .set({
                        count,
                        blocked_until: blocked_until ?? null,
                        updated_at: now,
                    })
                    .where(eq(schema.auth_rate_limit_buckets.id, id))
                    .pipe(
                        Effect.asVoid,
                        persistenceFailure("updateRateLimitBucket")
                    ),
            recordRateLimitDenied: (route, retry_after_seconds) =>
                db
                    .insert(schema.observability_logs)
                    .values({
                        level: "warning",
                        message: "auth.rate_limit.denied",
                        source: route,
                        metadata: { retry_after_seconds },
                    })
                    .pipe(
                        Effect.asVoid,
                        persistenceFailure("recordRateLimitDenied")
                    ),
        })
    })
)

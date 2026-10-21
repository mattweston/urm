/**
 * # OAuth States
 *
 * Server-side record of an in-flight OAuth handshake, holding hashed state and
 * verifier plus the trusted redirect target.
 */
import { createHash } from "node:crypto"
import { Effect } from "effect"
import type { DatabaseOperationError } from "@urm/db"
import { AuthPersistence } from "./auth-persistence.ts"

// Matches PKCE_COOKIE_OPTS's Max-Age=600 so the browser and server halves of a
// flow expire together.
export const OAUTH_STATE_TTL_MS = 1000 * 60 * 10

export type OAuthStateContext = Readonly<{
    redirect_to?: string | undefined
    host?: string | undefined
    domain_id?: string | undefined
    request_ip_hash?: string | undefined
    user_agent_hash?: string | undefined
}>

export type CreatedOAuthState = Readonly<{
    id: string
    expires_at: number
}>

export type ConsumedOAuthState = Readonly<{
    id: string
    provider: string
    redirect_to?: string | undefined
    host?: string | undefined
    domain_id?: string | undefined
}>

export const hashOAuthStateValue = (value: string): string =>
    createHash("sha256").update(value).digest("hex")

export const createOAuthState = (
    provider: string,
    state: string,
    code_verifier: string,
    context: OAuthStateContext = {}
): Effect.Effect<CreatedOAuthState, DatabaseOperationError, AuthPersistence> =>
    Effect.gen(function* () {
        const persistence = yield* AuthPersistence
        const now = Date.now()
        const expires_at = now + OAUTH_STATE_TTL_MS
        const id = yield* persistence.createOAuthState({
            provider,
            state_hash: hashOAuthStateValue(state),
            code_verifier_hash: hashOAuthStateValue(code_verifier),
            redirect_to: context.redirect_to,
            host: context.host,
            domain_id: context.domain_id,
            expires_at,
            created_at: now,
            context,
        })

        return {
            id,
            expires_at,
        }
    })

export const consumeOAuthState = (
    provider: string,
    state: string,
    code_verifier: string
): Effect.Effect<
    ConsumedOAuthState | undefined,
    DatabaseOperationError,
    AuthPersistence
> =>
    Effect.gen(function* () {
        const persistence = yield* AuthPersistence
        const now = Date.now()
        const stateRow = yield* persistence.consumeOAuthState(
            provider,
            hashOAuthStateValue(state),
            hashOAuthStateValue(code_verifier),
            now
        )

        if (stateRow === undefined) {
            return undefined
        }

        // These are the values recorded at authorize time, which is what makes
        // them safe to redirect to. A target read from the callback's query
        // string or from the unsigned PKCE cookie is attacker-controlled.
        return {
            id: stateRow.id,
            provider: stateRow.provider,
            redirect_to: stateRow.redirect_to,
            host: stateRow.host,
            domain_id: stateRow.domain_id,
        }
    })

/** # Connection-local session presentation gate */
import type * as AuthKit from "@urm/features/auth/authkit"

/**
 * Non-secret connection generation, deliberately renewed on reload. Restored
 * Foldkit state can contain a signed-in profile from an earlier connection, which
 * must not activate authenticated client work before this connection is verified.
 */
export const auth_connection_id = globalThis.crypto.randomUUID()

/**
 * Checks signed-in UI state against this connection generation. This gate prevents
 * restored client state from starting work prematurely; the server must still
 * verify its actual session and authorize every operation.
 */
export const has_verified_session = (model: {
    readonly auth: AuthKit.ModelType
    readonly auth_connection_id: string
}): boolean =>
    model.auth.status === "signed_in" &&
    model.auth_connection_id === auth_connection_id

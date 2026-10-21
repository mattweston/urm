/**
 * # Permissions Middleware
 *
 * Route-level role guards, reading the current role from the auth cookie.
 */
import { HttpServerRequest } from "effect/unstable/http"
import { Effect } from "effect"
import { AuthConfig } from "@urm/env/server"
import { Redacted } from "effect"
import { parseCookies } from "@urm/auth/cookies/parse-cookies"
import { verifyCookie } from "@urm/auth/cookies/verify-cookie"
import { hasRoleOrHigher } from "./roles.ts"
import { UnauthorizedError, ForbiddenError } from "./types.ts"
import type { Role } from "./roles.ts"

export const getCurrentRole = () =>
    Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest
        const authConfig = yield* AuthConfig
        const secret = Redacted.value(authConfig.authSecret)

        // Parse cookie header
        const cookieHeader = request.headers["cookie"]
        const cookies = parseCookies(cookieHeader)
        const signedValue = cookies["auth"]

        // Check if signed value exists
        if (!signedValue) {
            return yield* new UnauthorizedError({
                message: "Authentication required. No auth cookie found.",
            })
        }

        // Verify signature and extract contact ID
        const contactId = verifyCookie(signedValue, secret)

        // Check if contactId exists
        if (!contactId) {
            return yield* new UnauthorizedError({
                message: "Invalid or expired authentication token.",
            })
        }

        // Derive role from environment (future: lookup from database)
        const role = roleFromEnv(contactId)
        return role
    })

// Roles come from ADMIN_CONTACT_IDS, not the database, so only "admin" and
// "member" are ever produced. requireRole("owner") and requireRole("sysadmin")
// therefore cannot pass for anyone — the other ten roles in ROLE_HIERARCHY are
// vocabulary for a future domain_contacts lookup, not enforced today.
function roleFromEnv(contactId: string): Role {
    const adminIds = (process.env.ADMIN_CONTACT_IDS ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)

    if (adminIds.includes(contactId)) {
        return "admin"
    }

    return "member"
}

export const requireRole = (minRole: Role) =>
    Effect.gen(function* () {
        const currentRole = yield* getCurrentRole()

        if (!hasRoleOrHigher(currentRole, minRole)) {
            return yield* new ForbiddenError({
                message: `Insufficient permissions. Requires ${minRole} role, but contact has ${currentRole} role.`,
            })
        }
    })

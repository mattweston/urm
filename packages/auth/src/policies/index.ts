/**
 * # Policies
 *
 * Sketch of a future ABAC layer. Not used for real authorization decisions —
 * see ./permissions/ for what is actually enforced.
 */
export type AccessPolicy = {
    resource: string
    action: string
    attributes?: {
        roles?: string[]
        permissions?: string[]
        [key: string]: string[] | undefined
    }
}

type Principal = {
    attributes?: {
        roles: string[]
    }
}

// Not a working authorization check: resource and action are never read, a
// policy with no roles grants access to any principal with attributes, and
// roles are matched by exact string so an admin fails a policy requiring
// member. Use requireRole and ./permissions/guards.ts for real decisions.
export function checkAccess(
    principal: Principal,
    policy: AccessPolicy
): boolean {
    if (!principal?.attributes) return false

    // Check roles
    if (policy.attributes?.roles) {
        const hasRole = principal.attributes.roles.some((role: string) =>
            policy.attributes?.roles?.includes(role)
        )
        if (!hasRole) return false
    }

    return true
}

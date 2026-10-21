/**
 * # Permissions Guards
 *
 * Resource-level predicates combining role with record ownership. For
 * route-level guards see ./middleware.ts.
 */
export {
    hasRoleOrHigher,
    getRolesWithPrivilege,
    getRoleLevel,
} from "./roles.ts"

export { requireRole } from "./middleware.ts"

export type { Role } from "./roles.ts"

import type { Role } from "./roles.ts"
import { hasRoleOrHigher } from "./roles.ts"
import { requireRole } from "./middleware.ts"

export const patterns = {
    requireMember: () => requireRole("member"),
    requireAdmin: () => requireRole("admin"),

    canEditResource: (
        contactRole: Role,
        resourceOwnerId: string,
        contactId: string
    ): boolean => {
        // Admin can edit anything
        if (hasRoleOrHigher(contactRole, "admin")) {
            return true
        }
        // Non-admins can only edit their own resources
        return contactId === resourceOwnerId
    },

    canDeleteResource: (
        contactRole: Role,
        _resourceOwnerId: string,
        _contactId: string
    ): boolean => {
        // Only admin can delete (stricter than edit)
        return hasRoleOrHigher(contactRole, "admin")
    },

    canViewResource: (
        contactRole: Role,
        resourceVisibility: "public" | "authenticated" | "owner" | "team",
        resourceOwnerId: string,
        contactId: string
    ): boolean => {
        // Public visible to anyone
        if (resourceVisibility === "public") {
            return true
        }
        // This function cannot see whether the request is authenticated at all,
        // so "authenticated" passes for every role including visitor. Enforce
        // it upstream with requireRole or a session lookup — calling this alone
        // on an "authenticated" resource protects nothing.
        if (resourceVisibility === "authenticated") {
            return true
        }
        // Owner-only or team - only owner or admin
        if (resourceVisibility === "owner" || resourceVisibility === "team") {
            return (
                hasRoleOrHigher(contactRole, "admin") ||
                contactId === resourceOwnerId
            )
        }
        return false
    },

    filterByRole: (role: Role) => ({
        // Admin can view everything
        canViewAll: hasRoleOrHigher(role, "admin"),
        // Member can create and edit
        canCreateAndEdit: hasRoleOrHigher(role, "member"),
        // Admin can delete anything
        canDeleteAll: hasRoleOrHigher(role, "admin"),
        isReadOnlyRelationship: role === "visitor" || role === "customer",
        // Member can see more data
        isMemberPlus: hasRoleOrHigher(role, "member"),
    }),
}

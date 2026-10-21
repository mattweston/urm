/**
 * # Permissions
 *
 * Role-based access control: role hierarchy, guards, and error types.
 */
export {
    Role,
    ROLE_HIERARCHY,
    ROLE_DESCRIPTIONS,
    hasRoleOrHigher,
    getRolesWithPrivilege,
    getRoleLevel,
} from "./roles.ts"

// Middleware and guards
export { requireRole, getCurrentRole } from "./middleware.ts"
export { patterns } from "./guards.ts"

// Type definitions and errors
export { UnauthorizedError, ForbiddenError } from "./types.ts"
export type { PermissionMatrix } from "./types.ts"

// Error response handlers
export { authErrorToResponse } from "../error-handlers.ts"
export type { ErrorResponse } from "../error-handlers.ts"

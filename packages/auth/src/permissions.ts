export {
    Role,
    ROLE_HIERARCHY,
    ROLE_DESCRIPTIONS,
    hasRoleOrHigher,
    getRolesWithPrivilege,
    getRoleLevel,
} from "./permissions/roles.ts"
export { requireRole, getCurrentRole } from "./permissions/middleware.ts"
export { patterns } from "./permissions/guards.ts"
export { UnauthorizedError, ForbiddenError } from "./permissions/types.ts"
export type { PermissionMatrix } from "./permissions/types.ts"
export { authErrorToResponse } from "./error-handlers.ts"
export type { ErrorResponse } from "./error-handlers.ts"

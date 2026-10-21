// NOTE: Server-only exports (authRouter, signCookie, etc.) should be imported directly
// from their individual files, not from this main export to avoid bundling server code
// into the browser bundle. See "./router.js", "./cookies.js" for server-only modules.

// Frontend exports - hooks
export { useAuth, usePermissions } from "./hooks/index.js";
export type { AuthContextType, Role } from "./types.js";

// Frontend exports - components
export { AuthProvider } from "./auth-context.js";
export {
RoleGuard,
AuthGuard,
AdminGuard,
MemberGuard,
UserGuard,
} from "./components/role-guard.js";

// Frontend exports - utilities
export { hasRoleOrHigher } from "./auth-context.js";

// Permissions system (integrated from @urm/permissions)
export {
Role,
ROLE_HIERARCHY,
ROLE_DESCRIPTIONS,
hasRoleOrHigher as checkRoleOrHigher,
getRolesWithPrivilege,
getRoleLevel,
} from "./permissions/roles.js";
export { requireRole, getCurrentRole } from "./permissions/middleware.js";
export { patterns as permissionPatterns } from "./permissions/guards.js";
export { UnauthorizedError, ForbiddenError } from "./permissions/types.js";
export type { PermissionMatrix } from "./permissions/types.js";
